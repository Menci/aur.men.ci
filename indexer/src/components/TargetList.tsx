import Preact from "preact";
import { useState } from "preact/hooks";
import { Header } from "./Header";

import type { Target } from "../data";
import { TargetListItem } from "./TargetListItem";
import { Date } from "./Date";

interface TargetListProps {
  targets: Target[];
}

export const TargetList: Preact.FunctionalComponent<TargetListProps> = props => {
  const [filterKeyword, setFilterKeyword] = useState("");

  function filterTarget(target: Target) {
    const keyword = filterKeyword.trim();
    if (!keyword) return true;

    let regex: RegExp;
    try {
      regex = new RegExp(keyword);
    } catch (e) {}

    const test = (s: string) => s.includes(keyword) || (regex && regex.test(s));

    if (test(target.target)) return true;
    return target.buildTargets.some(buildTarget => buildTarget.packages.some(p => test(p.name)));
  }

  const filteredTargets = props.targets && props.targets.filter(filterTarget);

  const tableMessage = (message: string) => (
    <tr>
      <td colSpan={4} style="text-align: center; ">
        {message}
      </td>
    </tr>
  );

  const lastAttempt = props.targets && Math.max(...props.targets.map(target => target.date));

  return (
    <div class="container">
      <div class="divider" />
      <input
        type="text"
        placeholder="Filter by name (regex supported)"
        value={filterKeyword}
        onInput={e => setFilterKeyword((e.target as HTMLInputElement).value)}
      />
      <table class="main-table">
        <thead>
          <tr>
            <th class="expand-icon"></th>
            <th class="column-target">Target</th>
            <th class="column-status">Status</th>
            <th class="column-date">Update Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredTargets
            ? filteredTargets.length === 0
              ? tableMessage("Not Found")
              : filteredTargets.map(target => <TargetListItem target={target} />)
            : tableMessage("Loading...")}
        </tbody>
      </table>
      {props.targets && (
        <div class="last-build-attempt">
          <b>Last build attempt:</b> <Date date={lastAttempt} />
        </div>
      )}
    </div>
  );
};
