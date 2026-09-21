const express = require("express");
const crypto = require("crypto");
const { spawn } = require("child_process");

const authMiddleware = require("../middleware/authmiddleware");
const router = express.Router();
// Configuration

const INNER_EXEC_TIMEOUT_SECONDS = 5;
const HOST_LIFECYCLE_TIMEOUT_MS = 30_000;

const MAX_CODE_LENGTH = 10_000;
const MAX_OUTPUT_BYTES = 50 * 1024;

// POST /api/execute

router.post("/", authMiddleware, async (req, res) => {
  const { code } = req.body || {};

  // Validate code

  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({
      success: false,
      message: "Code is required",
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Code is too large. Maximum ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
    });
  }

  // Unique container name

  const containerName = `codelab-run-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;

  // Start Docker sandbox

  const docker = spawn("docker", [
    "run",

    // Automatically remove container after exit
    "--rm",

    // Keep stdin open so code can be passed to Node
    "-i",

    // Unique container name
    "--name",
    containerName,

    // Resource limits
    "--memory=128m",
    "--cpus=0.5",
    "--pids-limit=50",

    // No network access
    "--network=none",

    // Prevent filesystem writes
    "--read-only",

    // Remove Linux capabilities
    "--cap-drop=ALL",

    // Prevent privilege escalation
    "--security-opt=no-new-privileges",

    // Node image
    "node:20",

    // Inner execution timeout
    "timeout",
    `${INNER_EXEC_TIMEOUT_SECONDS}s`,

    "node",
    "-e",

    // Read user's code from stdin
    "eval(require('fs').readFileSync(0, 'utf8'))",
  ]);

  // Runtime state
  let stdout = "";
  let stderr = "";

  let responded = false;
  let hostTimedOut = false;

  // Cleanup
   
  const forceRemoveContainer = () => {
    const cleanup = spawn("docker", [
      "rm",
      "-f",
      containerName,
    ]);

    cleanup.on("error", (error) => {
      console.error(
        `[execute] Cleanup error for ${containerName}:`,
        error
      );
    });
  };
   
  // Response helper
   
  const finish = (payload, statusCode = 200) => {
    if (responded) {
      return;
    }

    responded = true;

    clearTimeout(hostTimeout);

    if (statusCode === 200) {
      return res.json(payload);
    }

    return res.status(statusCode).json(payload);
  };

  // Host/Docker lifecycle timeout

  const hostTimeout = setTimeout(() => {
    if (responded) {
      return;
    }

    hostTimedOut = true;

    console.error(
      `[execute] Host lifecycle timeout for ${containerName}`
    );

    // Kill Docker process
    try {
      docker.kill("SIGKILL");
    } catch (error) {
      console.error(
        `[execute] Failed to kill Docker process:`,
        error
      );
    }

    // Force remove container
    forceRemoveContainer();

    finish({
      success: false,
      output:
        "Execution environment did not respond in time (Docker lifecycle timeout). This indicates an infrastructure issue, not a problem with your code.",
    });
  }, HOST_LIFECYCLE_TIMEOUT_MS);

  // STDOUT
   
  docker.stdout.on("data", (data) => {
    if (responded) {
      return;
    }

    stdout += data.toString();

    // Prevent unlimited output
    if (stdout.length > MAX_OUTPUT_BYTES) {
      try {
        docker.kill("SIGKILL");
      } catch (error) {
        console.error(
          "[execute] Failed to stop Docker process:",
          error
        );
      }

      forceRemoveContainer();

      finish({
        success: false,
        output:
          "Execution stopped: output exceeded 50 KB.",
      });
    }
  });

  // STDERR
   
  docker.stderr.on("data", (data) => {
    if (responded) {
      return;
    }

    stderr += data.toString();

    // Prevent unlimited error output
    if (stderr.length > MAX_OUTPUT_BYTES) {
      try {
        docker.kill("SIGKILL");
      } catch (error) {
        console.error(
          "[execute] Failed to stop Docker process:",
          error
        );
      }

      forceRemoveContainer();

      finish({
        success: false,
        output:
          "Execution stopped: error output exceeded 50 KB.",
      });
    }
  });
   
  // Docker spawn error

  docker.on("error", (error) => {
    console.error(
      "[execute] Docker spawn error:",
      error
    );

    forceRemoveContainer();

    finish(
      {
        success: false,
        output:
          "Failed to start the execution environment.",
      },
      500
    );
  });

  // Docker process closed
  
  docker.on("close", (exitCode, signal) => {
    if (responded || hostTimedOut) {
      return;
    }

    // User code exceeded 5 seconds  
    if (exitCode === 124) {
      return finish({
        success: false,
        output:
          `Execution timed out: your code ran longer than ${INNER_EXEC_TIMEOUT_SECONDS} seconds.`,
      });
    }

    // Other execution errors
    
    if (exitCode !== 0) {
      return finish({
        success: false,
        output:
          stderr ||
          `Process exited with code ${exitCode}${
            signal ? ` (${signal})` : ""
          }`,
      });
    }

    // Successful execution
   
    return finish({
      success: true,
      output: stdout,
    });
  });

  // Send user's code to container
  
  docker.stdin.write(code);
  docker.stdin.end();
});

// Export router

module.exports = router;