import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';
import { menuPosition, showMenu } from 'web/menu';

afterEach(uninstallBridge);

it('drops a menu from under its anchor, or opens it at the pointer', () => {
  const anchor = document.createElement('div');
  anchor.getBoundingClientRect = () => ({ left: 10, bottom: 40 }) as DOMRect;
  expect(menuPosition(anchor)).toEqual({ x: 10, y: 40 });
  expect(menuPosition(undefined)).toBeUndefined();
  expect(menuPosition({})).toBeUndefined();
});

it("calls back with the chosen item's id, and not when dismissed", async () => {
  const bridge = installBridge({ menu: jest.fn(async () => 'b') });
  const onChoose = jest.fn();
  const items = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];
  await showMenu(items, onChoose);
  expect(bridge.menu).toHaveBeenCalledWith(items, undefined);
  expect(onChoose).toHaveBeenCalledWith('b');
  (bridge.menu as jest.Mock).mockResolvedValueOnce(null);
  await showMenu(items, onChoose);
  expect(onChoose).toHaveBeenCalledTimes(1);
});
