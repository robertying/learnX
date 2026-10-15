import CoreGraphics
let l = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
for w in l where (w["kCGWindowOwnerName"] as? String) == "learnX" && (w["kCGWindowLayer"] as? Int) == 0 { let b = w["kCGWindowBounds"] as! [String: Any]; print(b["X"]!, b["Y"]!, b["Width"]!, b["Height"]!); break }
