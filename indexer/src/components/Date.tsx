import * as Preact from "preact";
import moment from "dayjs";
import * as timeAgo from "timeago.js";

interface DateProps {
  date: number;
}

export const Date: Preact.FunctionalComponent<DateProps> = props => {
  const date = props.date * 1000;
  return <span title={moment(date).format("YYYY-MM-DD HH:mm:ss")}>{timeAgo.format(date)}</span>;
};
