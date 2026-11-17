import { menuTemplate, popupMenu } from '../menus.cjs';

type Template = { label?: string; type?: string; click?: () => void }[];

/** The template's items, as the tests click them. */
const items = (template: unknown) => template as Template;

it('keeps only the fields the page may set', () => {
  const onChoose = jest.fn();
  const template = items(
    menuTemplate(
      [
        { id: 'fav', label: 'Favorite' },
        { type: 'separator' },
        {
          id: 'all',
          label: 'All',
          type: 'radio',
          checked: true,
          sublabel: '20',
        },
        { id: 'x', label: 'Off', enabled: false, type: 'bogus', role: 'quit' },
        { label: 'No id' },
        null,
        'text',
      ],
      onChoose,
    ),
  );
  expect(template).toEqual([
    {
      label: 'Favorite',
      type: 'normal',
      checked: false,
      enabled: true,
      click: expect.any(Function),
    },
    { type: 'separator' },
    {
      label: 'All\t20',
      type: 'radio',
      checked: true,
      enabled: true,
      click: expect.any(Function),
    },
    {
      label: 'Off',
      type: 'normal',
      checked: false,
      enabled: false,
      click: expect.any(Function),
    },
  ]);
  template[2].click?.();
  expect(onChoose).toHaveBeenCalledWith('all');
  expect(menuTemplate('not a list', onChoose)).toEqual([]);
});

describe('popupMenu', () => {
  const makeMenu = () => {
    const popup = jest.fn();
    const Menu = {
      buildFromTemplate: jest.fn((template: Template) => ({
        popup: (options: object) => popup(template, options),
      })),
    };
    // Electron's Menu and window, as far as popupMenu uses them
    return { Menu: Menu as never, popup };
  };
  const win = {} as never;

  it("resolves with the item clicked, at the page's position", async () => {
    const { Menu, popup } = makeMenu();
    const chosen = popupMenu(Menu, win, [{ id: 'a', label: 'A' }], {
      x: 10.4,
      y: 20.6,
    });
    const [template, options] = popup.mock.calls[0];
    expect(options).toMatchObject({ window: win, x: 10, y: 21 });
    template[0].click();
    options.callback();
    await expect(chosen).resolves.toBe('a');
  });

  it('resolves with null when closed without a choice', async () => {
    jest.useFakeTimers();
    const { Menu, popup } = makeMenu();
    const chosen = popupMenu(Menu, win, [{ id: 'a', label: 'A' }], 'nowhere');
    const [, options] = popup.mock.calls[0];
    expect(options).not.toHaveProperty('x');
    options.callback();
    jest.advanceTimersByTime(100);
    await expect(chosen).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('shows nothing for an empty menu', async () => {
    const { Menu, popup } = makeMenu();
    await expect(popupMenu(Menu, win, [], undefined)).resolves.toBeNull();
    expect(popup).not.toHaveBeenCalled();
  });
});
