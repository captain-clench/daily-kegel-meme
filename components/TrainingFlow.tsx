"use client";

import { useMachine } from "@xstate/react";
import { setup, assign, fromCallback } from "xstate";
import { Button } from "@/components/ui/button";

interface Props {
  onComplete: () => void;
}

type TrainingPhase = "slow" | "fast" | "endurance";

interface TrainingConfig {
  name: string;
  contractTime: number;
  relaxTime: number;
  rounds: number;
}

const TRAINING_CONFIG: Record<TrainingPhase, TrainingConfig> = {
  slow: {
    name: "慢速训练",
    contractTime: 3,
    relaxTime: 3,
    rounds: 10,
  },
  fast: {
    name: "快速训练",
    contractTime: 1,
    relaxTime: 1,
    rounds: 15,
  },
  endurance: {
    name: "耐力训练",
    contractTime: 10,
    relaxTime: 10,
    rounds: 3,
  },
};

const PHASE_ORDER: TrainingPhase[] = ["slow", "fast", "endurance"];
const REST_TIME = 10;

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
  initial: "running",
  context: {
    trainingPhase: "slow",
    round: 1,
    timeLeft: TRAINING_CONFIG.slow.contractTime,
  },
  states: {
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
                guard: ({ context }) => context.timeLeft > 1,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                target: "relax",
                actions: assign({
                  timeLeft: ({ context }) => TRAINING_CONFIG[context.trainingPhase].relaxTime,
                }),
              },
            ],
          },
        },
        relax: {
          on: {
            TICK: [
              {
                guard: ({ context }) => context.timeLeft > 1,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                guard: ({ context }) =>
                  context.round < TRAINING_CONFIG[context.trainingPhase].rounds,
                target: "contract",
                actions: assign({
                  round: ({ context }) => context.round + 1,
                  timeLeft: ({ context }) => TRAINING_CONFIG[context.trainingPhase].contractTime,
                }),
              },
              {
                guard: ({ context }) => getNextPhase(context.trainingPhase) !== null,
                target: "rest",
                actions: assign({ timeLeft: () => REST_TIME }),
              },
              { target: "#training.complete" },
            ],
          },
        },
        rest: {
          on: {
            TICK: [
              {
                guard: ({ context }) => context.timeLeft > 1,
                actions: assign({ timeLeft: ({ context }) => context.timeLeft - 1 }),
              },
              {
                target: "contract",
                actions: assign({
                  trainingPhase: ({ context }) => getNextPhase(context.trainingPhase)!,
                  round: () => 1,
                  timeLeft: ({ context }) => {
                    const next = getNextPhase(context.trainingPhase)!;
                    return TRAINING_CONFIG[next].contractTime;
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

  const { trainingPhase, round, timeLeft } = state.context;
  const isComplete = state.matches("complete");
  const isPaused = state.matches("paused");
  const isRest = state.matches({ running: "rest" });
  const isContract = state.matches({ running: "contract" });

  if (isComplete) {
    return (
      <div className="bg-card rounded-lg p-8 text-center border">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-2">训练完成！</h3>
        <p className="text-muted-foreground mb-6">恭喜你完成今天的凯格尔训练</p>
        <Button size="lg" onClick={onComplete}>
          继续打卡
        </Button>
      </div>
    );
  }

  const config = TRAINING_CONFIG[trainingPhase];
  const nextPhase = getNextPhase(trainingPhase);

  const getPhaseStatus = (p: TrainingPhase) => {
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

      {isRest ? (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">休息时间</h3>
          <p className="text-muted-foreground text-center mb-8">
            准备进入 {nextPhase ? TRAINING_CONFIG[nextPhase].name : ""}
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">{config.name}</h3>
          <p className="text-muted-foreground text-center mb-2">
            第 {round} / {config.rounds} 轮
          </p>
        </>
      )}

      {/* Timer */}
      <div className="text-center mb-8">
        <div
          className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center text-5xl font-bold transition-colors ${
            isRest
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : isContract
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          }`}
        >
          {timeLeft}
        </div>
        <p className="mt-4 text-lg font-medium">
          {isRest ? "休息" : isContract ? "收紧" : "放松"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => send({ type: "TOGGLE_PAUSE" })}>
          {isPaused ? "继续" : "暂停"}
        </Button>
      </div>
    </div>
  );
}
