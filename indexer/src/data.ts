export interface PackageBuildResult extends MetadataItem {
  name: string;
}

export interface TargetBuildTarget {
  os: string;
  arch: string;
  packages: PackageBuildResult[];
}

export interface Target {
  target: string;
  targetRef: string;
  description: string;
  status: "success" | "failure";
  date: number;
  buildTargets: TargetBuildTarget[];
}

interface RepoConfigItem {
  target: string;
  "target-ref": string;
  arch: string;
  os: {
    id: string;
  };
}

export interface MetadataItem {
  status: "success" | "failure";
  target: string;
  targetRef: string;
  description: string;
  attempt: {
    version: string;
    date: number;
  };
  available?: {
    version: string;
    filename: string;
    date: number;
    size: number;
  };
}

export interface OS {
  name: string;
  versions?: string[];
}

export const osList: Record<string, OS> = {
  archlinux: {
    name: "Arch Linux"
  },
  manjaro: {
    name: "Manjaro"
  },
  ubuntu: {
    name: "Ubuntu",
    versions: ["20.04", "22.04"]
  },
  debian: {
    name: "Debian",
    versions: ["11"]
  }
};
const archList = ["x86_64", "aarch64"];

export async function fetchTargetList(apiRoot: string) {
  async function fetchJson<T>(url: string) {
    try {
      return (await (await fetch(url)).json()) as T;
    } catch (e) {
      return null;
    }
  }

  const [config, packagesMetadata] = await Promise.all([
    fetchJson<RepoConfigItem[]>(`${apiRoot}/config.json`),
    Promise.all(
      Object.keys(osList).flatMap(os =>
        (osList[os].versions || [""]).map(
          async version =>
            [
              os + version,
              Object.fromEntries(
                await Promise.all(
                  archList.map(
                    async arch =>
                      [
                        arch,
                        await fetchJson<Record<string, MetadataItem>>(
                          `${apiRoot}/${os}${version}/${arch}/metadata.json`
                        )
                      ] as const
                  )
                )
              )
            ] as const
        )
      )
    ).then(array => Object.fromEntries(array.filter(([, metadata]) => metadata)))
  ]);

  const result: Record<string, Target> = {};
  for (const configItem of config) {
    if (!(configItem.target in result)) {
      result[configItem.target] = {
        target: configItem.target,
        targetRef: configItem["target-ref"],
        description: "",
        status: "success",
        date: 0,
        buildTargets: []
      };
    }

    const target = result[configItem.target];
    const metadata = Object.entries(packagesMetadata[configItem.os.id][configItem.arch])
      .map<PackageBuildResult>(([key, value]) => ({ ...value, name: key }))
      .filter(item => item.target === configItem.target);
    target.buildTargets.push({
      os: configItem.os.id,
      arch: configItem.arch,
      packages: metadata
    });

    if (metadata) {
      if (metadata[0]?.description) target.description = metadata?.[0]?.description;

      metadata.forEach(p => {
        if (p.available?.date) target.date = Math.max(target.date, p.available?.date);
        if (p.status !== "success") target.status = p.status;
      });
    }
  }

  return Object.values(result).sort((p1, p2) => (p1.target < p2.target ? -1 : p1.target > p2.target ? 1 : 0));
}
