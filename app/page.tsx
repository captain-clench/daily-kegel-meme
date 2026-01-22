import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getSeasons() {
  const seasons = await prisma.season.findMany({
    where: { active: true },
    orderBy: { startTime: "desc" },
  });
  return seasons;
}

export default async function HomePage() {
  const seasons = await getSeasons();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            DailyKegel
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            每日凯格尔运动，锻炼盆底肌群，增强身体健康
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            DailyKegel 是一个 BSC 链上的 DApp，通过赛季制打卡激励你养成每日锻炼的习惯。
            完成训练后打卡，积累打卡次数，赢取赛季奖励！
          </p>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">如何参与</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="font-semibold mb-2">连接钱包</h3>
              <p className="text-sm text-muted-foreground">
                使用 MetaMask 或其他钱包连接到 BSC 网络
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🏋️</div>
              <h3 className="font-semibold mb-2">完成训练</h3>
              <p className="text-sm text-muted-foreground">
                跟随指引完成慢速、快速、耐力三项凯格尔训练
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="font-semibold mb-2">打卡领奖</h3>
              <p className="text-sm text-muted-foreground">
                每日打卡一次，赛季结束后打卡最多者赢得奖池
              </p>
            </div>
          </div>
        </section>

        {/* Season List */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-8">赛季列表</h2>
          {seasons.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>暂无进行中的赛季</p>
              <p className="text-sm mt-2">请稍后再来查看</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {seasons.map((season) => {
                const now = new Date();
                const isActive = now >= season.startTime && now < season.endTime;
                const isUpcoming = now < season.startTime;
                const isEnded = now >= season.endTime;

                return (
                  <Link
                    key={season.id}
                    href={`/season/${season.name}`}
                    className="block bg-card rounded-lg p-6 hover:shadow-lg transition-shadow border"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{season.displayName}</h3>
                      {isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          进行中
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          即将开始
                        </span>
                      )}
                      {isEnded && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          已结束
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        开始：{season.startTime.toLocaleDateString("zh-CN")}
                      </p>
                      <p>
                        结束：{season.endTime.toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
