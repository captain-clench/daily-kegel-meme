"use client";

import * as React from "react";
import { useMachine } from "@xstate/react";
import { setup, assign, fromCallback } from "xstate";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import styles from "./TrainingFlow.module.css";
import useTrans from "@/hooks/useTrans";

interface Props {
  onComplete: () => void;
}

type TrainingPhase = "slow" | "fast" | "endurance";

interface TrainingConfig {
  nameKey: string;
  contractTime: number;
  relaxTime: number;
  rounds: number;
}

const TRAINING_CONFIG: Record<TrainingPhase, TrainingConfig> = {
  slow: {
    nameKey: "slow",
    contractTime: 3,
    relaxTime: 3,
    rounds: 10,
  },
  fast: {
    nameKey: "fast",
    contractTime: 1,
    relaxTime: 1,
    rounds: 15,
  },
  endurance: {
    nameKey: "endurance",
    contractTime: 10,
    relaxTime: 10,
    rounds: 3,
  },
};

const PHASE_ORDER: TrainingPhase[] = ["slow", "fast", "endurance"];
const REST_TIME = 10;
const PREPARE_TIME = 10;

// 圆形进度条组件
function CircularProgress({
  progress,
  isContract,
  round,
}: {
  progress: number;
  isContract: boolean;
  round: number;
}) {
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    // 每一轮开始时重置动画
    setAnimating(false);
    const id = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(id);
  }, [round]);

  const size = 320;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 每轮开始时从 0 开始，然后动画到真实进度
  const displayProgress = animating ? progress : 0;
  const offset = circumference * (1 - displayProgress);

  return (
    <svg
      className="absolute inset-0 -rotate-90"
      width={size}
      height={size}
    >
      {/* 背景圆环 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      {/* 进度圆环 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-1000 ease-linear ${
          isContract ? "text-red-500" : "text-green-500"
        }`}
      />
    </svg>
  );
}

function getNextPhase(current: TrainingPhase): TrainingPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

interface Context {
  trainingPhase: TrainingPhase;
  round: number;
  timeLeft: number;
}

// 创建一个定时器 actor
const timerActor = fromCallback(({ sendBack }) => {
  const id = setInterval(() => {
    sendBack({ type: "TICK" });
  }, 1000);

  return () => clearInterval(id);
});

const trainingMachine = setup({
  types: {
    context: {} as Context,
    events: {} as { type: "TICK" } | { type: "TOGGLE_PAUSE" },
  },
  actors: {
    timer: timerActor,
  },
}).createMachine({
  id: "training",
  initial: "preparing",
  context: {
    trainingPhase: "slow",
    round: 1,
    timeLeft: PREPARE_TIME - 1,
  },
  states: {
    preparing: {
      invoke: {
        id: "timer",
        src: "timer",
      },
      on: {
        TICK: [
          {
            guard: ({ context }) => context.timeLeft > 0,
            actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
          },
          {
            target: "running",
            actions: assign({
              timeLeft: () => TRAINING_CONFIG.slow.contractTime - 1,
            }),
          },
        ],
      },
    },
    running: {
      initial: "contract",
      invoke: {
        id: "timer",
        src: "timer",
      },
      states: {
        contract: {
          on: {
            TICK: [
              {
                guard: ({ context }) => context.timeLeft > 0,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                target: "relax",
                actions: assign({
                  timeLeft: ({ context }) => TRAINING_CONFIG[context.trainingPhase].relaxTime - 1,
                }),
              },
            ],
          },
        },
        relax: {
          on: {
            TICK: [
              {
                guard: ({ context }) => context.timeLeft > 0,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                guard: ({ context }) =>
                  context.round < TRAINING_CONFIG[context.trainingPhase].rounds,
                target: "contract",
                actions: assign({
                  round: ({ context }) => context.round + 1,
                  timeLeft: ({ context }) => TRAINING_CONFIG[context.trainingPhase].contractTime - 1,
                }),
              },
              {
                guard: ({ context }) => getNextPhase(context.trainingPhase) !== null,
                target: "rest",
                actions: assign({ timeLeft: () => REST_TIME - 1 }),
              },
              { target: "#training.complete" },
            ],
          },
        },
        rest: {
          on: {
            TICK: [
              {
                guard: ({ context }) => context.timeLeft > 0,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                target: "contract",
                actions: assign({
                  trainingPhase: ({ context }) => getNextPhase(context.trainingPhase)!,
                  round: () => 1,
                  timeLeft: ({ context }) => {
                    const next = getNextPhase(context.trainingPhase)!;
                    return TRAINING_CONFIG[next].contractTime - 1;
                  },
                }),
              },
            ],
          },
        },
        hist: {
          type: "history",
          history: "shallow",
        },
      },
      on: {
        TOGGLE_PAUSE: "paused",
      },
    },
    paused: {
      on: {
        TOGGLE_PAUSE: "#training.running.hist",
      },
    },
    complete: {
      type: "final",
    },
  },
});

export function TrainingFlow({ onComplete }: Props) {
  const [state, send] = useMachine(trainingMachine);
  const { t } = useTrans("training");

  const { trainingPhase, round, timeLeft } = state.context;
  const isComplete = state.matches("complete");
  const isPaused = state.matches("paused");
  const isPreparing = state.matches("preparing");
  const isRest = state.matches({ running: "rest" });
  const isContract = state.matches({ running: "contract" });

  if (isComplete) {
    return (
      <div className="bg-card rounded-lg p-8 text-center border">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-2">{t("complete")}</h3>
        <p className="text-muted-foreground mb-6">{t("complete_desc")}</p>
        <Button size="lg" onClick={onComplete}>
          {t("continue_checkin")}
        </Button>
      </div>
    );
  }

  const config = TRAINING_CONFIG[trainingPhase];
  const nextPhase = getNextPhase(trainingPhase);

  const getPhaseStatus = (p: TrainingPhase) => {
    if (isPreparing) return "pending";
    const pIndex = PHASE_ORDER.indexOf(p);
    const currentIndex = PHASE_ORDER.indexOf(trainingPhase);

    if (pIndex < currentIndex) return "done";
    if (p === trainingPhase) return "current";
    return "pending";
  };

  return (
    <div className="bg-card rounded-lg p-8 border">
      {/* Phase indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {PHASE_ORDER.map((p) => {
          const status = getPhaseStatus(p);
          return (
            <div
              key={p}
              className={`w-3 h-3 rounded-full transition-colors ${
                status === "current"
                  ? "bg-primary"
                  : status === "done"
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          );
        })}
      </div>

      {isPreparing ? (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">{t("preparing")}</h3>
          <p className="text-muted-foreground text-center mb-8">
            {t("preparing_desc")}
          </p>
        </>
      ) : isRest ? (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">{t("rest_time")}</h3>
          <p className="text-muted-foreground text-center mb-8">
            {t("entering", { phase: nextPhase ? t(TRAINING_CONFIG[nextPhase].nameKey) : "" })}
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">{t(config.nameKey)}</h3>
          <p className="text-muted-foreground text-center mb-2">
            {t("round", { current: round, total: config.rounds })}
          </p>
        </>
      )}

      {/* Timer */}
      <div className="text-center mb-8">
        <div className="w-80 h-80 mx-auto relative">
          {/* 圆形进度条 */}
          <CircularProgress
            progress={(() => {
              if (isPreparing) {
                return (PREPARE_TIME - timeLeft) / PREPARE_TIME;
              }
              if (isRest) return 0;
              const totalRoundTime = config.contractTime + config.relaxTime;
              // timeLeft 范围: contractTime-1 ~ 0，进度目标为下一秒结束时的位置
              if (isContract) {
                return (config.contractTime - timeLeft) / totalRoundTime;
              } else {
                return (config.contractTime + config.relaxTime - timeLeft) / totalRoundTime;
              }
            })()}
            isContract={isContract}
            round={isPreparing ? 0 : round}
          />
          {/* 图片容器 */}
          <div className={`absolute inset-4 ${isContract ? styles.shaking : ""}`}>
            <Image
              src={isContract ? "/pp-0.png" : "/pp-1.png"}
              alt={isContract ? t("contract") : t("relax")}
              fill
              className="object-contain"
            />
          </div>
          {/* 倒计时数字 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold text-white drop-shadow-lg">
              {timeLeft}
            </span>
          </div>
        </div>
        <p className="mt-4 text-lg font-medium">
          {isPreparing ? t("prepare") : isRest ? t("rest") : isContract ? t("contract") : t("relax")}
        </p>
      </div>

      {/* Controls */}
      {!isPreparing && (
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => send({ type: "TOGGLE_PAUSE" })}>
            {isPaused ? t("continue") : t("pause")}
          </Button>
        </div>
      )}
    </div>
  );
}
