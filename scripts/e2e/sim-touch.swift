// Touches and typing on whichever display of a booted iOS simulator is lit, such as the inner
// display of an open iPhone Duo, which XCUITest's events (and so Maestro's) never reach.
//
// Usage: sim-touch <udid> <command> [--secondary-only]
//        sim-touch <udid> serve       one command per line on stdin, one answer line each
//   display                         prints the lit display: name, size in points, rotation, primary
//   tap <x> <y> [seconds]           a tap, or a press held that long
//   swipe <x1> <y1> <x2> <y2> [seconds]
//   type <text>                     ASCII text, through the hardware keyboard
//   erase <count>                   that many presses of Delete
// Points are in the lit display's points as the interface shows it (a screenshot of it divided by
// its scale). With --secondary-only it does nothing when the primary display is lit (exit code 3,
// or the answer "primary"), so a caller can send its own events there instead. Other answers are
// "ok", the display, or "error: <why>". A serve line puts --secondary-only first, and its text
// for `type` is the rest of the line, with \n for a newline and \\ for a backslash.
//
// The simulator sets up its touch devices for every new connection, which takes seconds, so a
// caller sending many events (patched Maestro, scripts/e2e/maestro) keeps one `serve` running.
//
// Built by scripts/e2e/e2e.sh (swiftc -O). Xcode 27's simulators take HID events from dtuhidd, a
// daemon inside the simulator, as XPC dictionaries; this connects to it the way idb does
// (github.com/facebook/idb, FBSimulatorControl/HID and CoreDevice), through CoreSimulator's
// private API.
import Foundation
import XPC

struct Failure: Error, CustomStringConvertible {
  let description: String
  init(_ description: String) { self.description = description }
}

// MARK: - Connecting

/// The booted simulator `udid`, from CoreSimulator.
func simDevice(_ udid: String) throws -> NSObject {
  guard dlopen("/Library/Developer/PrivateFrameworks/CoreSimulator.framework/CoreSimulator", RTLD_NOW) != nil,
    let contextClass = NSClassFromString("SimServiceContext") as AnyObject?
  else { throw Failure("CoreSimulator isn't available") }
  let developerDir = try xcodeDeveloperDir()
  guard
    let context = contextClass.perform(
      NSSelectorFromString("sharedServiceContextForDeveloperDir:error:"), with: developerDir, with: nil)?
      .takeUnretainedValue(),
    let set = context.perform(NSSelectorFromString("defaultDeviceSetWithError:"), with: nil)?.takeUnretainedValue(),
    let devices = set.value(forKey: "devices") as? [NSObject]
  else { throw Failure("Couldn't list the simulators") }
  guard let device = devices.first(where: { ($0.value(forKey: "UDID") as? NSUUID)?.uuidString == udid.uppercased() })
  else { throw Failure("No simulator \(udid)") }
  guard (device.value(forKey: "stateString") as? String) == "Booted" else { throw Failure("\(udid) isn't booted") }
  return device
}

func xcodeDeveloperDir() throws -> String {
  if let dir = ProcessInfo.processInfo.environment["DEVELOPER_DIR"], !dir.isEmpty { return dir }
  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/usr/bin/xcode-select")
  process.arguments = ["-p"]
  let pipe = Pipe()
  process.standardOutput = pipe
  try process.run()
  process.waitUntilExit()
  let output = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
  return output.trimmingCharacters(in: .whitespacesAndNewlines)
}

/// An XPC connection to `service` inside the simulator. The endpoint symbols are libxpc's
/// simulator-to-host SPI, looked up at run time.
func connect(_ device: NSObject, _ service: String) throws -> xpc_connection_t {
  typealias Lookup = @convention(c) (AnyObject, Selector, NSString, UnsafeMutablePointer<NSError?>?) -> mach_port_t
  typealias EndpointFromPort = @convention(c) (mach_port_t, UInt64, UInt64) -> Unmanaged<AnyObject>?
  typealias ConnectionFromEndpoint = @convention(c) (xpc_object_t) -> Unmanaged<AnyObject>?
  typealias EnableSim2Host = @convention(c) (xpc_connection_t) -> Void
  let selector = NSSelectorFromString("lookup:error:")
  guard let implementation = device.method(for: selector),
    let handle = dlopen(nil, RTLD_NOW),
    let endpointSymbol = dlsym(handle, "xpc_endpoint_create_mach_port_4sim"),
    let connectionSymbol = dlsym(handle, "xpc_connection_create_from_endpoint"),
    let enableSymbol = dlsym(handle, "xpc_connection_enable_sim2host_4sim")
  else { throw Failure("This Xcode lacks the simulator XPC symbols") }
  var error: NSError?
  let port = unsafeBitCast(implementation, to: Lookup.self)(device, selector, service as NSString, &error)
  guard port != MACH_PORT_NULL else {
    throw Failure("The simulator doesn't offer \(service)\(error.map { ": \($0.localizedDescription)" } ?? "")")
  }
  guard
    let endpoint = unsafeBitCast(endpointSymbol, to: EndpointFromPort.self)(port, 0, 0)?.takeRetainedValue() as! xpc_object_t?,
    let connection = unsafeBitCast(connectionSymbol, to: ConnectionFromEndpoint.self)(endpoint)?.takeRetainedValue()
      as! xpc_connection_t?
  else { throw Failure("Couldn't connect to \(service)") }
  unsafeBitCast(enableSymbol, to: EnableSim2Host.self)(connection)
  xpc_connection_set_event_handler(connection) { _ in }
  xpc_connection_resume(connection)
  return connection
}

func dictionary(_ entries: KeyValuePairs<String, xpc_object_t>) -> xpc_object_t {
  let object = xpc_dictionary_create(nil, nil, 0)
  for (key, value) in entries { xpc_dictionary_set_value(object, key, value) }
  return object
}

func request(_ connection: xpc_connection_t, _ message: xpc_object_t) throws -> xpc_object_t {
  let reply = xpc_connection_send_message_with_reply_sync(connection, message)
  guard xpc_get_type(reply) == XPC_TYPE_DICTIONARY else { throw Failure("The simulator didn't answer: \(reply)") }
  return reply
}

func string(_ object: xpc_object_t, _ key: String) -> String? {
  xpc_dictionary_get_string(object, key).map { String(cString: $0) }
}

func array(_ object: xpc_object_t?) -> [xpc_object_t] {
  guard let object, xpc_get_type(object) == XPC_TYPE_ARRAY else { return [] }
  return (0..<xpc_array_get_count(object)).map { xpc_array_get_value(object, $0) }
}

// MARK: - The lit display

struct Display {
  let name: String
  let primary: Bool
  /// The panel's size in points, before the interface's rotation.
  let panel: CGSize
  /// The interface's rotation on the panel: rot0, rot90, rot180 or rot270.
  let rotation: String
  /// The touchscreen of this display, as dtuhidd numbers it.
  let target: UInt64

  /// The display's size in points as the interface shows it.
  var size: CGSize {
    ["rot90", "rot270"].contains(rotation) ? CGSize(width: panel.height, height: panel.width) : panel
  }

  /// A point as the interface shows it, as a fraction of the panel, which the digitizer takes.
  func normalized(_ x: Double, _ y: Double) -> (Double, Double) {
    let (x, y) = (min(max(x, 0), size.width) / size.width, min(max(y, 0), size.height) / size.height)
    switch rotation {
    case "rot90": return (y, 1 - x)
    case "rot180": return (1 - x, 1 - y)
    case "rot270": return (1 - y, x)
    default: return (x, y)
    }
  }
}

/// The display that is lit, from CoreDevice's displayinfo feature (`info`), with its touchscreen.
func litDisplay(_ info: xpc_connection_t, udid: String, target: (String) throws -> UInt64) throws -> Display {
  guard
    let version = Bundle(url: URL(fileURLWithPath: "/Library/Developer/PrivateFrameworks/CoreDevice.framework"))?
      .object(forInfoDictionaryKey: "CFBundleVersion") as? String
  else { throw Failure("CoreDevice isn't installed") }
  let components = xpc_array_create(nil, 0)
  for part in version.split(separator: ".") { xpc_array_append_value(components, xpc_uint64_create(UInt64(part) ?? 0)) }
  let reply = try request(
    info,
    dictionary([
      "CoreDevice.actionIdentifier": xpc_string_create("com.apple.coredevice.action.displayinfo"),
      "CoreDevice.deviceIdentifier": xpc_string_create(udid),
      "CoreDevice.invocationIdentifier": xpc_string_create(UUID().uuidString),
      "CoreDevice.CoreDeviceDDIProtocolVersion": xpc_int64_create(1),
      "CoreDevice.coreDeviceVersion": dictionary([
        "components": components,
        "originalComponentsCount": xpc_int64_create(Int64(xpc_array_get_count(components))),
        "stringValue": xpc_string_create(version),
      ]),
      "CoreDevice.input": xpc_dictionary_create(nil, nil, 0),
    ]))
  guard let output = xpc_dictionary_get_dictionary(reply, "CoreDevice.output") else {
    throw Failure("The simulator didn't report its displays: \(reply)")
  }
  let lit = array(xpc_dictionary_get_value(output, "displays")).filter {
    xpc_dictionary_get_dictionary($0, "type").map { xpc_dictionary_get_value($0, "integrated") != nil } ?? false
      && (xpc_dictionary_get_bool($0, "active") || string($0, "backlightState") == "activeOn")
  }
  guard lit.count == 1, let record = lit.first, let id = string(record, "uniqueId") else {
    throw Failure("Not exactly one display is lit (\(lit.count)); is the hinge still moving?")
  }
  let bounds = array(xpc_dictionary_get_value(record, "bounds"))
  let scale = Double(xpc_dictionary_get_int64(record, "pointScale"))
  guard bounds.count == 2, scale > 0 else { throw Failure("Unexpected display bounds") }
  let panel = CGSize(
    width: xpc_array_get_double(bounds[1], 0) / scale, height: xpc_array_get_double(bounds[1], 1) / scale)
  return Display(
    name: string(record, "name") ?? "",
    primary: xpc_dictionary_get_bool(record, "primary"),
    panel: panel,
    rotation: string(record, "currentOrientation") ?? "rot0",
    target: try target(id))
}

/// The touchscreen of display `displayID`, from the universal HID service, which names each
/// touchscreen's display.
func touchscreenTarget(_ device: NSObject, displayID: String) throws -> UInt64 {
  let hid = try connect(device, "com.apple.coredevice.feature.remote.universalhidservice")
  defer { xpc_connection_cancel(hid) }
  let reply = try request(
    hid,
    dictionary([
      "isBarrier": xpc_bool_create(false),
      "payload": dictionary(["connectedServices": xpc_dictionary_create(nil, nil, 0)]),
    ]))
  // A touchscreen is HID usage page 0x0D (digitizer), usage 0x04; its service id is 0x100 + target.
  for service in array(xpc_dictionary_get_value(reply, "connectedServices"))
  where string(service, "displayUUID") == displayID && xpc_dictionary_get_uint64(service, "PrimaryUsagePage") == 0x0D {
    let id = xpc_dictionary_get_uint64(service, "_ServiceID")
    if id & ~0xFF == 0x100 { return id & 0xFF }
  }
  throw Failure("No touchscreen for display \(displayID)")
}

// MARK: - Events

/// The digitizer service, which takes touches and hardware keyboard keys.
struct Digitizer {
  static let service = "com.apple.coredevice.feature.remote.hid.digitizer"
  let connection: xpc_connection_t

  init(_ device: NSObject) throws {
    connection = try connect(device, Self.service)
    // dtuhidd answers a barrier once it is up; an empty key (usage 0) shows nothing.
    _ = try request(connection, message("IndigoKeyboardButtonEvent", barrier: true, ["usageCode": xpc_uint64_create(0), "state": xpc_uint64_create(2)]))
    Thread.sleep(forTimeInterval: 0.2)
  }

  func message(_ type: String, barrier: Bool = false, _ payload: KeyValuePairs<String, xpc_object_t>) -> xpc_object_t {
    dictionary([
      "messageType": xpc_string_create(type),
      "isBarrier": xpc_bool_create(barrier),
      "featureIdentifier": xpc_string_create(Self.service),
      "payload": dictionary(payload),
    ])
  }

  /// One finger on `display`: phase 0 puts it down, 1 moves it, 2 lifts it.
  func touch(_ display: Display, _ x: Double, _ y: Double, phase: UInt64) {
    let (u, v) = display.normalized(x, y)
    xpc_connection_send_message(
      connection,
      message("IndigoDigitizerEvent", [
        "pointOne": dictionary(["x": xpc_double_create(u), "y": xpc_double_create(v)]),
        "eventType": xpc_uint64_create(phase),
        "edge": xpc_uint64_create(0),
        "target": xpc_uint64_create(display.target),
      ]))
  }

  /// A key down (1) or up (2), by its HID keyboard usage.
  func key(_ usage: UInt64, down: Bool) {
    xpc_connection_send_message(
      connection,
      message("IndigoKeyboardButtonEvent", ["usageCode": xpc_uint64_create(usage), "state": xpc_uint64_create(down ? 1 : 2)]))
  }

  /// Lets the events sent so far reach the simulator before the next command or the process exits.
  func flush() {
    let sent = DispatchSemaphore(value: 0)
    xpc_connection_send_barrier(connection) { sent.signal() }
    sent.wait()
    Thread.sleep(forTimeInterval: 0.1)
  }
}

/// A finger moved from one point to another, at 60 samples a second.
func drag(_ digitizer: Digitizer, _ display: Display, from start: (Double, Double), to end: (Double, Double), seconds: Double) {
  digitizer.touch(display, start.0, start.1, phase: 0)
  let steps = max(Int(seconds * 60), 1)
  for step in 1...steps {
    Thread.sleep(forTimeInterval: seconds / Double(steps))
    let t = Double(step) / Double(steps)
    digitizer.touch(display, start.0 + (end.0 - start.0) * t, start.1 + (end.1 - start.1) * t, phase: 1)
  }
  digitizer.touch(display, end.0, end.1, phase: 2)
}

/// The HID keyboard usage of an ASCII character on a US keyboard, and whether it needs Shift.
func keyUsage(_ character: Character) -> (UInt64, Bool)? {
  guard let ascii = character.asciiValue else { return nil }
  switch character {
  case "a"..."z": return (UInt64(ascii - 97 + 0x04), false)
  case "A"..."Z": return (UInt64(ascii - 65 + 0x04), true)
  case "1"..."9": return (UInt64(ascii - 49 + 0x1E), false)
  case "0": return (0x27, false)
  default: break
  }
  let keys: [Character: (UInt64, Bool)] = [
    "\n": (0x28, false), "\t": (0x2B, false), " ": (0x2C, false), "-": (0x2D, false), "_": (0x2D, true),
    "=": (0x2E, false), "+": (0x2E, true), "[": (0x2F, false), "{": (0x2F, true), "]": (0x30, false),
    "}": (0x30, true), "\\": (0x31, false), "|": (0x31, true), ";": (0x33, false), ":": (0x33, true),
    "'": (0x34, false), "\"": (0x34, true), "`": (0x35, false), "~": (0x35, true), ",": (0x36, false),
    "<": (0x36, true), ".": (0x37, false), ">": (0x37, true), "/": (0x38, false), "?": (0x38, true),
    "!": (0x1E, true), "@": (0x1F, true), "#": (0x20, true), "$": (0x21, true), "%": (0x22, true),
    "^": (0x23, true), "&": (0x24, true), "*": (0x25, true), "(": (0x26, true), ")": (0x27, true),
  ]
  return keys[character]
}

// MARK: - Main

/// One simulator's connections, kept for every command.
final class Session {
  let udid: String
  let device: NSObject
  private let info: xpc_connection_t
  private var targets: [String: UInt64] = [:]
  private var digitizer: Digitizer?

  init(udid: String) throws {
    self.udid = udid
    device = try simDevice(udid)
    info = try connect(device, "com.apple.coredevice.feature.getdisplayinfo")
  }

  /// Runs one command and returns its answer; nil when `secondaryOnly` and the primary display is lit.
  func run(_ words: [String], secondaryOnly: Bool) throws -> String? {
    guard let command = words.first else { throw Failure("No command") }
    let values = Array(words.dropFirst())
    let numbers = values.compactMap(Double.init)
    let display = try litDisplay(info, udid: udid) { id in
      if let target = targets[id] { return target }
      let target = try touchscreenTarget(device, displayID: id)
      targets[id] = target
      return target
    }
    if secondaryOnly && display.primary { return nil }
    switch command {
    case "display":
      return "\(display.name) \(Int(display.size.width))x\(Int(display.size.height)) \(display.rotation)\(display.primary ? " primary" : "")"
    case "tap" where numbers.count == values.count && (2...3).contains(numbers.count):
      let digitizer = try connectedDigitizer()
      digitizer.touch(display, numbers[0], numbers[1], phase: 0)
      Thread.sleep(forTimeInterval: numbers.count == 3 ? numbers[2] : 0.05)
      digitizer.touch(display, numbers[0], numbers[1], phase: 2)
      digitizer.flush()
    case "swipe" where numbers.count == values.count && (4...5).contains(numbers.count):
      let digitizer = try connectedDigitizer()
      drag(digitizer, display, from: (numbers[0], numbers[1]), to: (numbers[2], numbers[3]), seconds: numbers.count == 5 ? numbers[4] : 0.3)
      digitizer.flush()
    case "erase" where numbers.count == 1 && values.count == 1:
      let digitizer = try connectedDigitizer()
      for _ in 0..<max(Int(numbers[0]), 0) {
        digitizer.key(0x2A, down: true)
        digitizer.key(0x2A, down: false)
        Thread.sleep(forTimeInterval: 0.02)
      }
      digitizer.flush()
    case "type" where !values.isEmpty:
      let keys = try values.joined(separator: " ").map { character in
        guard let key = keyUsage(character) else { throw Failure("Can't type \"\(character)\": only ASCII") }
        return key
      }
      let digitizer = try connectedDigitizer()
      let shift: UInt64 = 0xE1
      // Each key waits a moment after the one before, or iOS can take a key before its Shift.
      for (usage, shifted) in keys {
        for (key, down) in (shifted ? [(shift, true)] : []) + [(usage, true), (usage, false)] + (shifted ? [(shift, false)] : []) {
          digitizer.key(key, down: down)
          Thread.sleep(forTimeInterval: 0.02)
        }
      }
      digitizer.flush()
    default:
      throw Failure("Unknown command or arguments: \(words.joined(separator: " "))")
    }
    return "ok"
  }

  private func connectedDigitizer() throws -> Digitizer {
    if let digitizer { return digitizer }
    let connected = try Digitizer(device)
    digitizer = connected
    return connected
  }
}

/// A serve line's text with \n and \\ turned back into a newline and a backslash.
func unescaped(_ text: String) -> String {
  var result = ""
  var escaping = false
  for character in text {
    if escaping {
      result.append(character == "n" ? "\n" : character)
      escaping = false
    } else if character == "\\" {
      escaping = true
    } else {
      result.append(character)
    }
  }
  return result
}

func main() -> Int32 {
  var arguments = Array(CommandLine.arguments.dropFirst())
  let secondaryOnly = arguments.contains("--secondary-only")
  arguments.removeAll { $0 == "--secondary-only" }
  guard arguments.count >= 2 else {
    FileHandle.standardError.write(Data("Usage: sim-touch <udid> display|tap|swipe|type|serve …\n".utf8))
    return 2
  }
  let session: Session
  do {
    session = try Session(udid: arguments[0])
  } catch {
    FileHandle.standardError.write(Data("sim-touch: \(error)\n".utf8))
    return 1
  }
  guard arguments[1] == "serve" else {
    do {
      guard let answer = try session.run(Array(arguments.dropFirst()), secondaryOnly: secondaryOnly) else { return 3 }
      if answer != "ok" { print(answer) }
      return 0
    } catch {
      FileHandle.standardError.write(Data("sim-touch: \(error)\n".utf8))
      return 1
    }
  }
  setvbuf(stdout, nil, _IOLBF, 0)
  while var line = readLine() {
    let flag = "--secondary-only "
    let lineSecondaryOnly = line.hasPrefix(flag)
    if lineSecondaryOnly { line.removeFirst(flag.count) }
    // `type` keeps its text as it is, spaces included.
    let words =
      line.hasPrefix("type ")
      ? ["type", unescaped(String(line.dropFirst("type ".count)))]
      : line.split(separator: " ").map(String.init)
    do {
      print(try session.run(words, secondaryOnly: lineSecondaryOnly) ?? "primary")
    } catch {
      print("error: \(error)")
    }
  }
  return 0
}

exit(main())
