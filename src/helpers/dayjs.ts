import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import { getLocale } from "./i18n";

if (getLocale().startsWith("zh")) {
  dayjs.locale("zh-cn");
}

dayjs.extend(LocalizedFormat);
dayjs.extend(relativeTime);

export default dayjs;
