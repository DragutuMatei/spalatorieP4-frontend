import React, { useCallback, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../utils/fire_config";
import { toast_error, toast_success } from "../utils/Toasts";
import dayjs from "dayjs";

const COLLECTIONS_TO_DUPLICATE = [
  "notifications",
  "programari",
  "settings",
  "users",
];

const formatDuration = (durationMs) => {
  if (typeof durationMs !== "number" || Number.isNaN(durationMs)) {
    return "n/a";
  }
  if (durationMs < 1_000) {
    return `${durationMs} ms`;
  }
  const seconds = durationMs / 1_000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = (seconds % 60).toFixed(1);
  return `${minutes} min ${restSeconds} s`;
};

const LocalDataTools = () => {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);

  const appendLog = useCallback((entry) => {
    setLogs((prev) => [
      {
        timestamp: dayjs().format("HH:mm:ss"),
        message: entry,
      },
      ...prev,
    ]);
  }, []);

  const createBatchWithGuard = useCallback(() => {
    return {
      batch: writeBatch(firestore),
      count: 0,
      commitAsync: async function commitAsync(isFinal = false) {
        if (this.count === 0 && !isFinal) {
          return;
        }
        await this.batch.commit();
        this.batch = writeBatch(firestore);
        this.count = 0;
      },
      set: function set(targetRef, data) {
        this.batch.set(targetRef, data);
        this.count += 1;
      },
    };
  }, []);

  const resetLogs = useCallback(() => {
    setLogs([]);
    setLastRunAt(null);
  }, []);

  const duplicateCollection = useCallback(
    async (collectionName) => {
      const targetName = `${collectionName}_local`;
      appendLog(
        `Încep copierea colecției "${collectionName}" către "${targetName}"...`
      );

      const start = performance.now();
      const snapshot = await getDocs(collection(firestore, collectionName));

      if (snapshot.empty) {
        appendLog(
          `Colecția "${collectionName}" este goală. Nimic de copiat.`
        );
        return { totalDocuments: 0, duration: performance.now() - start };
      }

      const batchController = createBatchWithGuard();
      const MAX_BATCH_SIZE = 450;
      let totalDocuments = 0;

      for (const docSnap of snapshot.docs) {
        const destinationRef = doc(collection(firestore, targetName), docSnap.id);
        batchController.set(destinationRef, docSnap.data());
        totalDocuments += 1;

        if (batchController.count >= MAX_BATCH_SIZE) {
          await batchController.commitAsync();
        }
      }

      await batchController.commitAsync(true);

      const duration = performance.now() - start;
      appendLog(
        `Colecția "${collectionName}" copiată cu succes (${totalDocuments} documente, ${formatDuration(
          duration
        )}).`
      );

      return { totalDocuments, duration };
    },
    [appendLog, createBatchWithGuard]
  );

  const runCopy = useCallback(async () => {
    if (isRunning) {
      toast_error("O operațiune este deja în desfășurare.");
      return;
    }

    resetLogs();
    setIsRunning(true);

    try {
      const results = [];
      let totalDocs = 0;
      let totalDuration = 0;

      for (const col of COLLECTIONS_TO_DUPLICATE) {
        try {
          const result = await duplicateCollection(col);
          results.push({ collection: col, ...result });
          totalDocs += result.totalDocuments;
          totalDuration += result.duration;
        } catch (collectionError) {
          console.error("Copy failed for collection", col, collectionError);
          appendLog(
            `❌ Eroare la copierea colecției "${col}": ${collectionError.message}`
          );
          throw collectionError;
        }
      }

      appendLog(
        `✅ Copiere finalizată. ${totalDocs} documente migrate în ${formatDuration(
          totalDuration
        )}.`
      );
      setLastRunAt(dayjs());
      toast_success("Colecțiile au fost replicate în *_local.");

      return results;
    } catch (error) {
      toast_error(error.message || "Copierea a eșuat.");
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [appendLog, duplicateCollection, isRunning, resetLogs]);

  const lastRunLabel = useMemo(() => {
    if (!lastRunAt) return null;
    return lastRunAt.format("DD/MM/YYYY HH:mm:ss");
  }, [lastRunAt]);

  return (
    <div className="local-data-tools" style={{ padding: "24px" }}>
      <h1>Utilitare Date Locale</h1>
      <p>
        Copiază conținutul colecțiilor Firestore în variante cu sufixul
        <code> _local</code>. Folosește această unealtă înainte de a lucra
        offline sau pe <code>localhost</code>.
      </p>

      <div style={{ margin: "16px 0" }}>
        <button
          className="btn btn-primary"
          onClick={runCopy}
          disabled={isRunning}
        >
          {isRunning ? "Se copiază..." : "Copiază colecțiile în *_local"}
        </button>
        <button
          className="btn"
          style={{ marginLeft: "12px" }}
          onClick={resetLogs}
          disabled={isRunning}
        >
          Șterge logurile
        </button>
      </div>

      {lastRunLabel && (
        <p>
          Ultima rulare: <strong>{lastRunLabel}</strong>
        </p>
      )}

      <section
        style={{
          marginTop: "24px",
          padding: "16px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          background: "#f9fafb",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Log operațiuni</h2>
        {logs.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Încă nu există loguri.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {logs.map((entry, index) => (
              <li
                key={`${entry.timestamp}-${index}`}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    color: "#6b7280",
                    minWidth: "70px",
                  }}
                >
                  {entry.timestamp}
                </span>
                <span>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default LocalDataTools;
