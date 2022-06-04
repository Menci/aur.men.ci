import * as Preact from "preact";
import { useState } from "preact/hooks";
import moment from "dayjs";

import { Target, osList } from "../data";
import { Date } from "./Date";

interface TargetListItemProps {
  target: Target;
}

export const TargetListItem: Preact.FunctionalComponent<TargetListItemProps> = props => {
  const [expanded, setExpanded] = useState(false);
  const target = props.target;

  const osName = Object.fromEntries(
    Object.keys(osList).flatMap(os =>
      (osList[os].versions || [""]).map(version => [os + version, osList[os].name + " " + version])
    )
  );

  return (
    <>
      <tr
        data-error={target.status === "failure"}
        data-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: "pointer",
          borderBottom: expanded ? "none" : ""
        }}
      >
        <td class="expand-icon"></td>
        <td class="column-target" title={"AUR ref: " + target.targetRef}>
          {target.target}
        </td>
        <td class="column-status">{target.status}</td>
        <td class="column-date">
          <Date date={target.date} />
        </td>
      </tr>
      {expanded && (
        <tr class="second-tr">
          <td></td>
          <td colSpan={3}>
            <table class="sub-table">
              <thead>
                <tr>
                  <th class="sub-table-column-os">OS</th>
                  <th class="sub-table-column-arch">Arch</th>
                  <th class="sub-table-column-name">Name</th>
                  <th class="sub-table-column-version">Current Ver.</th>
                  <th class="sub-table-column-attempt-date">Last Attempt</th>
                  <th class="sub-table-column-download">Download</th>
                </tr>
              </thead>
              <tbody>
                {target.buildTargets.map(buildTarget => (
                  <Preact.Fragment key={`${buildTarget.os}/${buildTarget.arch}`}>
                    {buildTarget.packages.map(p => (
                      <tr key={p.name} data-error={p.status === "failure"}>
                        <td class="sub-table-column-os">{osName[buildTarget.os]}</td>
                        <td class="sub-table-column-arch">{buildTarget.arch}</td>
                        <td class="sub-table-column-name">{p.name}</td>
                        <td class="sub-table-column-version">{p.available?.version}</td>
                        <td class="sub-table-column-attempt-date">
                          <Date date={p.attempt.date} />
                        </td>
                        <td class="sub-table-column-download">
                          <>
                            {
                              <>
                                {p.status === "failure" && (
                                  <a href={`/${buildTarget.os}/${buildTarget.arch}/logs/${target.target}.log`}>
                                    Error Log
                                  </a>
                                )}
                                &nbsp;
                              </>
                            }
                            {p.available && (
                              <a href={`/${buildTarget.os}/${buildTarget.arch}/${p.available.filename}`}>Package</a>
                            )}
                          </>
                        </td>
                      </tr>
                    ))}
                  </Preact.Fragment>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
};
