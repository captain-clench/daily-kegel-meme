"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  onComplete: () => void;
}

type Phase = "slow" | "fast" | "endurance" | "rest" | "complete";
type Action = "contract" | "relax";

interface TrainingConfig {
  name: string;
  contractTime: number; // seconds
  relaxTime: number; // seconds
  rounds: number;
}

const TRAINING_CONFIG: Record<"slow" | "fast" | "endurance", TrainingConfig> = {
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

const REST_TIME = 10; // seconds between phases

export function TrainingFlow({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("slow");
  const [round, setRound] = useState(1);
  const [action, setAction] = useState<Action>("contract");
  const [timeLeft, setTimeLeft] = useState(TRAINING_CONFIG.slow.contractTime);
  const [isPaused, setIsPaused] = useState(false);

  const getCurrentConfig = useCallback(() => {
    if (phase === "slow" || phase === "fast" || phase === "endurance") {
      return TRAINING_CONFIG[phase];
    }
    return null;
  }, [phase]);

  const nextPhase = useCallback((): Phase => {
    if (phase === "slow") return "rest";
    if (phase === "fast") return "rest";
    if (phase === "endurance") return "complete";
    return "complete";
  }, [phase]);

  const getNextTrainingPhase = useCallback((): Phase => {
    if (phase === "slow") return "fast";
    if (phase === "fast") return "endurance";
    return "complete";
  }, [phase]);

  useEffect(() => {
    if (isPaused || phase === "complete") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, move to next state
          const config = getCurrentConfig();

          if (phase === "rest") {
            // Rest over, move to next training phase
            const nextTraining = getNextTrainingPhase();
            if (nextTraining === "complete") {
              setPhase("complete");
              return 0;
            }
            setPhase(nextTraining);
            setRound(1);
            setAction("contract");
            return TRAINING_CONFIG[nextTraining as keyof typeof TRAINING_CONFIG].contractTime;
          }

          if (config) {
            if (action === "contract") {
              // Switch to relax
              setAction("relax");
              return config.relaxTime;
            } else {
              // Finished one round
              if (round >= config.rounds) {
                // Phase complete
                const next = nextPhase();
                if (next === "rest") {
                  setPhase("rest");
                  return REST_TIME;
                } else if (next === "complete") {
                  setPhase("complete");
                  return 0;
                }
              } else {
                // Next round
                setRound((r) => r + 1);
                setAction("contract");
                return config.contractTime;
              }
            }
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, action, round, isPaused, getCurrentConfig, nextPhase, getNextTrainingPhase]);

  if (phase === "complete") {
    return (
      <div className="bg-card rounded-lg p-8 text-center border">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-2">训练完成！</h3>
        <p className="text-muted-foreground mb-6">
          恭喜你完成今天的凯格尔训练
        </p>
        <Button size="lg" onClick={onComplete}>
          继续打卡
        </Button>
      </div>
    );
  }

  const config = getCurrentConfig();

  return (
    <div className="bg-card rounded-lg p-8 border">
      {/* Phase indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {(["slow", "fast", "endurance"] as const).map((p) => (
          <div
            key={p}
            className={`w-3 h-3 rounded-full ${
              p === phase || (phase === "rest" && getNextTrainingPhase() === p)
                ? "bg-primary"
                : phase === "rest" &&
                  ((p === "slow" && getNextTrainingPhase() !== "slow") ||
                   (p === "fast" && getNextTrainingPhase() === "endurance"))
                ? "bg-primary/50"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {phase === "rest" ? (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">休息时间</h3>
          <p className="text-muted-foreground text-center mb-8">
            准备进入 {TRAINING_CONFIG[getNextTrainingPhase() as keyof typeof TRAINING_CONFIG]?.name}
          </p>
        </>
      ) : config ? (
        <>
          <h3 className="text-xl font-semibold text-center mb-2">{config.name}</h3>
          <p className="text-muted-foreground text-center mb-2">
            第 {round} / {config.rounds} 轮
          </p>
        </>
      ) : null}

      {/* Timer */}
      <div className="text-center mb-8">
        <div
          className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center text-5xl font-bold transition-colors ${
            phase === "rest"
              ? "bg-blue-100 text-blue-800"
              : action === "contract"
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {timeLeft}
        </div>
        <p className="mt-4 text-lg font-medium">
          {phase === "rest" ? "休息" : action === "contract" ? "收紧" : "放松"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? "继续" : "暂停"}
        </Button>
      </div>
    </div>
  );
}
