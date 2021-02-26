###### CONSISTENCY BETWEEN MACOS AND IOS #####
#
# In order to use the same PodFile with MacOS, we need to unlink the libraries that do not support Catalyst, filter
# files in native targets build phases, filter dependencies and make sure the unsupported frameworks along with their
# their bundle resources are not included in the final archive. For that, we use `platform_filter` to specify 'ios' and
# 'OTHER_LDFLAGS[sdk=iphone*]' to link those libraries for iPhone and iPad. Besides, we modify "*frameworks.sh" and
# "*resrouces.sh" to skip installation for sdk MacOS.
#
# *Notice*: 'sdk=iphone*' excludes macOS, even though Catalyst is compiled with iOS SDK.
#
# ADDING A NEW LIBRARY
#
# Pass the name of the new library to the script
#
###### RESOURCES #######
#
# https://www.bitbuildr.com/tech-blog/mac-catalyst-porting-an-app-using-crashlytics-firebase - Article that inspired this script
# https://github.com/CocoaPods/Xcodeproj - Xcode configuration using ruby. This Framework is already included on cocoapods environment
# https://www.rubydoc.info/gems/xcodeproj/Xcodeproj/Project/Object/AbstractTarget Wiki for Xcodeproj
#
require 'cocoapods'

include Xcodeproj::Project::Object
include Pod

$verbose = false

def loggs string
  if $verbose
    puts string
  end
  return
end

# EXTENSIONS

class String
  def filter_lines
    lines = []
    each_line do |line|
      if yield line
        lines = lines + [line]
      end
    end
    return lines
  end
end

class PBXNativeTarget

  ###### STEP 4 ######
  # In "Pods-" targets, modify "*frameworks.sh" to not install unsupported frameworks for SDK
  def uninstall_frameworks frameworks, platform
    uninstall frameworks, "#{name}-frameworks.sh", platform.sdk_root
  end

  ###### STEP 5 ######
  # In "Pods-" targets, modify "*resources.sh" to not install unsupported resources for SDK
  def uninstall_resources resources, platform
    uninstall resources, "#{name}-resources.sh", platform.sdk_root
  end

  def support_files_folder
    build_configurations.filter do |config| not config.base_configuration_reference.nil? end.first.base_configuration_reference.real_path.parent
  end

  @private
  def uninstall keys, file_name, sdk_root
    configurations = build_configurations.map do |b| b.name end
    keys = keys.to_set.to_a
    loggs "\t\t\tUninstalling for configurations: #{configurations}"
    if support_files_folder.nil?
      loggs "\t\t\tNothing to uninstall"
      return
    end

    script_path = support_files_folder.join file_name
    if !script_path.exist?
      loggs "\t\t\tNothing to uninstall"
      return
    end

    script = File.read(script_path)
    snippets = script.scan(/if \[\[ \"\$CONFIGURATION\" [\S\s]*?(?=fi\n)fi/)
    archs_condition = "[[ \"$SDKROOT\" != *\"#{sdk_root}\"* ]]"
    file_condition_format = 'if [ -d "%s" ]; then'
    changed = false

    snippets.each do |snippet|
      new_snippet = snippet.clone
      should_uninstall = configurations.map do |string| snippet.include? string end.reduce(false) do |total, condition| total = total || condition end
      keys.each do |key|
        lines_to_replace = snippet.filter_lines do |line| line.include? "#{key}" end.to_set.to_a
        unless lines_to_replace.empty?
          changed = true
          lines_to_replace.each do |line|
            if should_uninstall
              new_snippet.gsub! line, "\tif #{archs_condition}; then \n\t#{line}\tfi\n"
            elsif file_name.include? 'resources'
              path = line.scan(/[^(install_resource| |")].*[^*("|\n)]/).first
              file_condition = file_condition_format % path
              new_snippet.gsub! line, "\t#{file_condition} \n\t#{line}\tfi\n"
            end
          end
        end
      end
      script.gsub! snippet, new_snippet
    end

    if changed
      File.open(script_path, "w") { |file| file << script }
    end
    loggs "\t\t\t#{changed ? "Succeded" : "Nothing to uninstall"}"
  end

  ###### STEP 1 ######
  # In native target's build phases, add platform filter to:
  # - Resources
  # - Compile Sources
  # - Frameworks
  # - Headers
  def add_platform_filter_to_build_phases platform
    loggs "\t\t- Filtering resources"
    resources_build_phase.files.to_a.map do |build_file| build_file.platform_filter = platform.filter end

    loggs "\t\t- Filtering compile sources"
    source_build_phase.files.to_a.map do |build_file| build_file.platform_filter = platform.filter end

    loggs "\t\t- Filtering frameworks"
    frameworks_build_phase.files.to_a.map do |build_file| build_file.platform_filter = platform.filter end

    loggs "\t\t- Filtering headers"
    headers_build_phase.files.to_a.map do |build_file| build_file.platform_filter = platform.filter end
  end

end

class PodTarget

  #build_settings[:debug].other_ldflags
  def module_name
    string = name.clone.gsub! /(-(iOS([0-9]+(\.[0-9])?)*|library|framework))*$/, ''
    return string.nil? ? name : string
  end

  def resources
    resources = file_accessors.flat_map do |accessor| accessor.resources end.map do |path| "#{path.basename}" end
    bundles = file_accessors.flat_map do |accessor| accessor.resource_bundles end.flat_map do |dic| dic.keys end.map do |s| s + ".bundle" end
    return resources + bundles
  end

  def vendor_products
    return file_accessors.flat_map do |accessor|
      accessor.vendored_frameworks + accessor.vendored_libraries
    end.map do |s| s.basename
    end.map do |s|
      name = "#{s}"
      if name.include? "framework"
        PodDependency.newFramework name.sub(".framework", "").sub(".xcframework", "")
      else
        PodDependency.newLibrary name.sub("lib", "").sub(".a", "")
      end
    end
  end

  def frameworks
    return file_accessors.flat_map do |accessor|
      accessor.spec_consumer.frameworks.map do |name| PodDependency.newFramework name  end + accessor.spec_consumer.libraries.map do |name| PodDependency.newLibrary name end
    end
  end

end

class PBXTargetDependency
  def module_name
    string = name.clone.gsub! /(-(iOS([0-9]+(\.[0-9])?)*|library|framework))*$/, ''
    return string.nil? ? name : string
  end
end

class AbstractTarget

  def module_name
    string = name.clone.gsub! /(-(iOS([0-9]+(\.[0-9])?)*|library|framework))*$/, ''
    return string.nil? ? name : string
  end

  ###### STEP 2 ######
  # In all targets (aggregates + native), filter dependencies
  def add_platform_filter_to_dependencies platform
    loggs "\t\t- Filtering dependencies"
    dependencies.each do |dependency|
      dependency.platform_filter = platform.name.to_s
    end
  end

  ###### STEP 3 ######
  # If any unsupported library, then flag as platform-dependant for every build configuration
  def flag_libraries libraries, platform
    loggs "\tTarget: #{name}"
    build_configurations.filter do |config| !config.base_configuration_reference.nil?
    end.each do |config|
      loggs "\t\tScheme: #{config.name}"
      xcconfig_path = config.base_configuration_reference.real_path
      xcconfig = File.read(xcconfig_path)

      changed = false
      libraries.each do |framework|
        if xcconfig.include? framework
          xcconfig.gsub!(framework, '')
          unless xcconfig.include? "OTHER_LDFLAGS[sdk=#{platform.sdk}]"
            changed = true
            xcconfig += "\nOTHER_LDFLAGS[sdk=#{platform.sdk}] = $(inherited) -ObjC "
          end
          xcconfig += framework + ' '
        end
      end

      File.open(xcconfig_path, "w") { |file| file << xcconfig }
      loggs "\t\t\t#{changed ? "Succeded" : "Nothing to flag"}"
    end
  end

  def to_dependency
    # We return both as we don't know if build as library or framework
    return [PodDependency.newFramework(module_name), PodDependency.newLibrary(name)]
  end

  # Dependencies contained in Other Linker Flags
  def other_linker_flags_dependencies
    config = build_configurations.filter do |config| not config.base_configuration_reference.nil? end.first
    other_ldflags = config.resolve_build_setting 'OTHER_LDFLAGS'

    if other_ldflags.nil?
      return []
    end

    if other_ldflags.class == String
      other_ldflags = other_ldflags.split ' '
    end

    libraries = other_ldflags.filter do |flag| flag.start_with? '-l' end.map do |flag| flag.gsub! /(["|\-l]*)/, '' end.map do |name| PodDependency.newLibrary name end
    mixed_frameworks = other_ldflags.filter do |flag| !flag.start_with? '-l' end

    weak_frameworks = mixed_frameworks.length.times.filter do |i| mixed_frameworks[i].include? 'weak_framework' end.map do |i| PodDependency.newWeakFramework(mixed_frameworks[i+1].gsub! '"', '') end
    frameworks = mixed_frameworks.length.times.select do |i| mixed_frameworks[i].match /^([^{weak_}]*)framework$/ end.map do |i| PodDependency.newFramework(mixed_frameworks[i+1].gsub! '"', '') end
    return libraries + frameworks + weak_frameworks
  end
end
# HELPER CLASSES
class PodDependency
  attr_reader :name
  attr_reader :type
  def link
    case type
    when :weak_framework
      return "-weak_framework \"#{name}\""
    when :library
      return "-l\"#{name}\""
    else
      return "-framework \"#{name}\""
    end
  end
  def self.newWeakFramework name
    return PodDependency.new(name, :weak_framework)
  end
  def self.newFramework name
    return PodDependency.new(name, :framework)
  end
  def self.newLibrary name
    return PodDependency.new(name, :library)
  end
  def ==(other)
    (name == other.name) && (type == other.type)
  end
  def eql?(other)
    self == other
   end
  private
  def initialize(name, type)
    @name = name
    @type = type
  end
end
class OSPlatform
  attr_reader :name
  attr_reader :sdk
  attr_reader :sdk_root
  attr_reader :filter
  def self.ios
    OSPlatform.new :ios, 'iphone*', 'iPhoneOS', 'ios'
  end
  def self.macos
    OSPlatform.new :macos, 'macosx*', 'MacOS', 'maccatalyst'
  end
  def self.watchos
    OSPlatform.new :watchos, 'watchos*', 'WatchOS', 'watchos'
  end
  def self.tvos
    OSPlatform.new :tvos, 'appletvos*', 'AppleTVOS', 'tvos'
  end
  private
  def initialize(name, sdk, sdk_root, filter)
    @name = name
    @sdk = sdk
    @sdk_root = sdk_root
    @filter = filter
  end
end
# SCRIPT
class Installer
  def configure_support_catalyst
    catalyst_pods_to_remove = (defined? podfile.catalyst_unsupported_pods) ? podfile.catalyst_unsupported_pods : []
    if !catalyst_pods_to_remove.empty?
      remove_dependencies catalyst_pods_to_remove, OSPlatform.macos, OSPlatform.ios
    end
    ios_pods_to_remove = (defined? podfile.catalyst_only_pods) ? podfile.catalyst_only_pods : []
    if !ios_pods_to_remove.empty?
      remove_dependencies ios_pods_to_remove, OSPlatform.ios, OSPlatform.macos
    end
  end
  def remove_dependencies pod_names_to_remove, remove_platform, keep_platform
    loggs "\n#### Configuring #{remove_platform.name} dependencies ####\n"
    ###### Variable definition ######
    all_pods = podfile.dependencies.flat_map do |d| [d.name, d.to_root_dependency.name] end.to_set.to_a.map do |s| s.sub('/', '') end
    pod_names_to_remove = podfile.dependencies.filter do |d| pod_names_to_remove.include? d.name end.flat_map do |d| [d.name, d.to_root_dependency.name] end.map do |s| s.sub('/', '') end
    pod_names_to_keep = all_pods.filter do |name| !pod_names_to_remove.include? name end
    $verbose = (defined? podfile.debug) ? podfile.debug : $verbose
    pod_names_to_keep = recursive_dependencies(pod_names_to_keep)
    pod_targets_to_keep = pod_targets.filter do |pod| pod_names_to_keep.include? pod.module_name end       # PodTarget
    pod_names_to_remove = recursive_dependencies(pod_names_to_remove).filter do |name| !pod_names_to_keep.include? name end
    pod_targets_to_remove = pod_targets.filter do |pod| pod_names_to_remove.include? pod.module_name end   # PodTarget
    loggs "\n#### Unsupported Libraries ####\n#{pod_names_to_remove}\n"
    targets_to_remove = pods_project.targets.filter do |target| pod_names_to_remove.include?(target.module_name) end.filter do |target| target.platform_name == OSPlatform.ios.name end # AbstractTarget
    pods_targets = pods_project.targets.filter do |target| target.name.start_with? "Pods-" end.filter do |target| target.platform_name == OSPlatform.ios.name end   # AbstractTarget
    targets_to_keep = pods_project.targets.filter do |target| !targets_to_remove.include?(target) && !pods_targets.include?(target) end.filter do |target| target.platform_name == OSPlatform.ios.name end   # AbstractTarget
    ######  Determine which dependencies should be removed ######
    dependencies_to_keep = targets_to_keep.reduce([]) do |dependencies, target| dependencies + target.other_linker_flags_dependencies end
    dependencies_to_keep = dependencies_to_keep + targets_to_keep.flat_map do |target| target.to_dependency end + pod_targets_to_keep.flat_map do |pod| pod.vendor_products + pod.frameworks end

    dependencies_to_remove = targets_to_remove.reduce([]) do |dependencies, target| dependencies + target.other_linker_flags_dependencies end
    dependencies_to_remove = dependencies_to_remove + targets_to_remove.flat_map do |target| target.to_dependency end + pod_targets_to_remove.flat_map do |pod| pod.vendor_products + pod.frameworks end
    dependencies_to_remove = dependencies_to_remove.filter do |d|  !dependencies_to_keep.include? d end
    ###### CATALYST NOT SUPPORTED LINKS ######
    unsupported_links = dependencies_to_remove.map do |d| d.link end.to_set.to_a

    loggs "\n#### Unsupported dependencies ####\n"
    loggs "#{dependencies_to_remove.map do |d| d.name end.to_set.to_a }\n\n"
    ###### CATALYST NOT SUPPORTED FRAMEWORKS AND RESOURCES
    frameworks_to_uninstall = dependencies_to_remove.filter do |d| d.type == :framework || d.type == :weak_framework end.map do |d| "#{d.name}.framework" end
    resources_to_uninstall = pod_targets_to_remove.flat_map do |pod| pod.resources end.to_set.to_a
    loggs "#### Frameworks not to be included in the Archive ####\n"
    loggs "#{frameworks_to_uninstall}\n\n"
    loggs "#### Resources not to be included in the Archive ####\n"
    loggs "#{resources_to_uninstall}\n\n"
    ###### OTHER LINKER FLAGS -> to iphone* ######
    loggs "#### Flagging unsupported libraries ####"
    pods_project.targets.filter do |target| target.platform_name == OSPlatform.ios.name end.each do |target| target.flag_libraries unsupported_links, keep_platform end
    ###### BUILD_PHASES AND DEPENDENCIES -> PLATFORM_FILTER 'ios' ######
    loggs "\n#### Filtering build phases ####"
    targets_to_remove.filter do |target|
      pods_project.native_targets.include? target
    end.each do |target|
      loggs "\tTarget: #{target.name}"
      target.add_platform_filter_to_build_phases keep_platform
      target.add_platform_filter_to_dependencies keep_platform
    end

    loggs "\n#### Filtering dependencies ####"
    targets_to_remove.filter do |target|
      !pods_project.native_targets.include? target
    end.each do |target|
      loggs "\tTarget: #{target.name}"
      target.add_platform_filter_to_dependencies keep_platform
    end

    ###### FRAMEWORKS AND RESOURCES SCRIPT -> if [ "$SDKROOT" != "MacOS" ]; then #######
    loggs "\n#### Changing frameworks and resources script ####"
    pods_targets.each do |target|
      loggs "\tTarget: #{target.name}"
      loggs "\t\t-Uninstalling frameworks"
      target.uninstall_frameworks frameworks_to_uninstall, remove_platform

      loggs "\t\t-Uninstalling resources"
      target.uninstall_resources resources_to_uninstall, remove_platform
    end
  end

  @private
  def recursive_dependencies to_filter_names
    targets = pods_project.targets
    targets_to_remove = pods_project.targets.filter do |target| to_filter_names.include? target.module_name end
    dependencies = targets_to_remove.flat_map do |target| target.dependencies end
    dependencies_names = dependencies.map do |d| d.module_name end

    if dependencies.empty?
      return to_filter_names + dependencies_names
    else
      return to_filter_names + recursive_dependencies(dependencies_names)
    end

  end

end
