// The icons Fluent UI's components import from '@fluentui/react-icons', from
// their own modules: the package's index has every icon (about 20 MB), and
// the web build doesn't tree-shake. Metro resolves that import here in the
// Electron app (aliases.json); src/web/__tests__ checks the list is whole.
// The app's own icons are in web/fluentIcons.
export {
  bundleIcon,
  iconFilledClassName,
  iconRegularClassName,
} from '@fluentui/react-icons/utils';
export { ArrowDownRegular } from '@fluentui/react-icons/svg/arrow-down';
export { ArrowUpRegular } from '@fluentui/react-icons/svg/arrow-up';
export {
  Checkmark12Filled,
  Checkmark16Filled,
  CheckmarkFilled,
} from '@fluentui/react-icons/svg/checkmark';
export {
  CheckmarkCircle12Filled,
  CheckmarkCircleFilled,
} from '@fluentui/react-icons/svg/checkmark-circle';
export {
  ChevronDown16Regular,
  ChevronDown20Regular,
  ChevronDownRegular,
} from '@fluentui/react-icons/svg/chevron-down';
export {
  ChevronLeftFilled,
  ChevronLeftRegular,
} from '@fluentui/react-icons/svg/chevron-left';
export {
  ChevronRight12Regular,
  ChevronRightFilled,
  ChevronRightRegular,
} from '@fluentui/react-icons/svg/chevron-right';
export { ChevronUp16Regular } from '@fluentui/react-icons/svg/chevron-up';
export { CircleFilled } from '@fluentui/react-icons/svg/circle';
export {
  DiamondDismiss12Filled,
  DiamondDismissFilled,
} from '@fluentui/react-icons/svg/diamond-dismiss';
export {
  Dismiss12Regular,
  Dismiss20Regular,
  DismissFilled,
  DismissRegular,
} from '@fluentui/react-icons/svg/dismiss';
export { DismissCircleFilled } from '@fluentui/react-icons/svg/dismiss-circle';
export {
  Info12Filled,
  Info12Regular,
  Info16Filled,
  Info16Regular,
  Info20Filled,
  Info20Regular,
  InfoFilled,
} from '@fluentui/react-icons/svg/info';
export { Lightbulb16Regular } from '@fluentui/react-icons/svg/lightbulb';
export {
  MoreHorizontalFilled,
  MoreHorizontalRegular,
} from '@fluentui/react-icons/svg/more-horizontal';
export { Navigation20Filled } from '@fluentui/react-icons/svg/navigation';
export { PauseCircleRegular } from '@fluentui/react-icons/svg/pause-circle';
export { PersonRegular } from '@fluentui/react-icons/svg/person';
export { Pin20Regular } from '@fluentui/react-icons/svg/pin';
export { PlayCircleRegular } from '@fluentui/react-icons/svg/play-circle';
export {
  PresenceAvailable10Filled,
  PresenceAvailable10Regular,
  PresenceAvailable12Filled,
  PresenceAvailable12Regular,
  PresenceAvailable16Filled,
  PresenceAvailable16Regular,
  PresenceAvailable20Filled,
  PresenceAvailable20Regular,
} from '@fluentui/react-icons/svg/presence-available';
export {
  PresenceAway10Filled,
  PresenceAway10Regular,
  PresenceAway12Filled,
  PresenceAway12Regular,
  PresenceAway16Filled,
  PresenceAway16Regular,
  PresenceAway20Filled,
  PresenceAway20Regular,
} from '@fluentui/react-icons/svg/presence-away';
export {
  PresenceBlocked10Regular,
  PresenceBlocked12Regular,
  PresenceBlocked16Regular,
  PresenceBlocked20Regular,
} from '@fluentui/react-icons/svg/presence-blocked';
export {
  PresenceBusy10Filled,
  PresenceBusy12Filled,
  PresenceBusy16Filled,
  PresenceBusy20Filled,
} from '@fluentui/react-icons/svg/presence-busy';
export {
  PresenceDnd10Filled,
  PresenceDnd10Regular,
  PresenceDnd12Filled,
  PresenceDnd12Regular,
  PresenceDnd16Filled,
  PresenceDnd16Regular,
  PresenceDnd20Filled,
  PresenceDnd20Regular,
} from '@fluentui/react-icons/svg/presence-dnd';
export {
  PresenceOffline10Regular,
  PresenceOffline12Regular,
  PresenceOffline16Regular,
  PresenceOffline20Regular,
} from '@fluentui/react-icons/svg/presence-offline';
export {
  PresenceOof10Regular,
  PresenceOof12Regular,
  PresenceOof16Regular,
  PresenceOof20Regular,
} from '@fluentui/react-icons/svg/presence-oof';
export {
  PresenceUnknown10Regular,
  PresenceUnknown12Regular,
  PresenceUnknown16Regular,
  PresenceUnknown20Regular,
} from '@fluentui/react-icons/svg/presence-unknown';
export { ProhibitedFilled } from '@fluentui/react-icons/svg/prohibited';
export { SearchRegular } from '@fluentui/react-icons/svg/search';
export {
  Square12Filled,
  Square16Filled,
} from '@fluentui/react-icons/svg/square';
export { StarFilled, StarRegular } from '@fluentui/react-icons/svg/star';
export {
  Warning12Filled,
  WarningFilled,
} from '@fluentui/react-icons/svg/warning';
export type { FluentIcon, FluentIconsProps } from '@fluentui/react-icons';
