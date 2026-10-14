import ExpoModulesCore
import UIKit

/// The system's sidebar list, so that the rows look and behave as in any other app: their metrics, the selection
/// (gray while the window isn't key), keyboard navigation, and insets that follow the column's as it slides.
final class SidebarView: ExpoView, UICollectionViewDelegate {
  let onSelect = EventDispatcher()

  private var items: [SidebarItem] = []
  private var selectedKey: String?

  private let collectionView: UICollectionView
  private var dataSource: UICollectionViewDiffableDataSource<Int, String>!

  required init(appContext: AppContext? = nil) {
    var configuration = UICollectionLayoutListConfiguration(appearance: .sidebar)
    // The column's own background shows through.
    configuration.backgroundColor = .clear
    collectionView = UICollectionView(
      frame: .zero,
      collectionViewLayout: UICollectionViewCompositionalLayout.list(using: configuration)
    )

    super.init(appContext: appContext)

    collectionView.backgroundColor = .clear
    collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    collectionView.frame = bounds
    collectionView.delegate = self
    addSubview(collectionView)

    let registration = UICollectionView.CellRegistration<UICollectionViewListCell, String> {
      [weak self] cell, _, key in
      guard let item = self?.items.first(where: { $0.key == key }) else {
        return
      }
      var content = cell.defaultContentConfiguration()
      content.text = item.title
      content.image = UIImage(systemName: item.systemImage)
      cell.contentConfiguration = content

      if item.badge {
        let (accessory, dot) = Self.badge()
        cell.accessories = [accessory]
        // Red, except over the selection, where it takes the color of the selected text.
        cell.configurationUpdateHandler = { _, state in
          dot.backgroundColor = state.isSelected ? .white : .systemRed
        }
      } else {
        cell.accessories = []
        cell.configurationUpdateHandler = nil
      }
    }
    dataSource = UICollectionViewDiffableDataSource(collectionView: collectionView) {
      collectionView, indexPath, key in
      collectionView.dequeueConfiguredReusableCell(using: registration, for: indexPath, item: key)
    }
  }

  func setItems(_ newItems: [SidebarItem]) {
    let changedKeys = newItems.filter { item in
      items.contains { $0.key == item.key && $0 != item }
    }.map(\.key)
    items = newItems

    var snapshot = NSDiffableDataSourceSnapshot<Int, String>()
    snapshot.appendSections([0])
    snapshot.appendItems(newItems.map(\.key))
    snapshot.reconfigureItems(changedKeys.filter { snapshot.indexOfItem($0) != nil })
    dataSource.apply(snapshot, animatingDifferences: false)
    updateSelection()
  }

  func setSelectedKey(_ key: String?) {
    selectedKey = key
    updateSelection()
  }

  func setAccentColor(_ color: UIColor?) {
    collectionView.tintColor = color
  }

  private func updateSelection() {
    let selectedIndexPath = selectedKey.flatMap { dataSource.indexPath(for: $0) }
    for indexPath in collectionView.indexPathsForSelectedItems ?? [] where indexPath != selectedIndexPath {
      collectionView.deselectItem(at: indexPath, animated: false)
    }
    if let selectedIndexPath, collectionView.indexPathsForSelectedItems?.contains(selectedIndexPath) != true {
      collectionView.selectItem(at: selectedIndexPath, animated: false, scrollPosition: [])
    }
  }

  // MARK: - UICollectionViewDelegate

  func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
    guard let key = dataSource.itemIdentifier(for: indexPath) else {
      return
    }
    // React follows with the new selected key.
    onSelect(["key": key])
  }

  // MARK: - Badge

  private static func badge() -> (UICellAccessory, UIView) {
    let size: CGFloat = 8
    let dot = UIView(frame: CGRect(x: 0, y: 0, width: size, height: size))
    dot.layer.cornerRadius = size / 2
    dot.backgroundColor = .systemRed
    var configuration = UICellAccessory.CustomViewConfiguration(customView: dot, placement: .trailing())
    configuration.maintainsFixedSize = true
    return (.customView(configuration: configuration), dot)
  }
}
