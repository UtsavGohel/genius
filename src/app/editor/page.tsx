"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { CheckCircle, Folder, Play } from "lucide-react";
import { WebContainer } from "@webcontainer/api";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { parseXml } from "./components/steps";

// Create a global webcontainerInstance to ensure we only boot once
let webcontainerInstance = null;

export default function MonacoEditor() {
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStatus, setFileStatus] = useState({});
  const [content, setContent] = useState("");
  const [steps, setSteps] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewURL, setPreviewURL] = useState("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isWebContainerReady, setIsWebContainerReady] = useState(false);
  const iframeRef = useRef(null);
  const searchParams = useSearchParams();
  const serverUrlRef = useRef(null);
  const initializationAttemptedRef = useRef(false);
  const initializingRef = useRef(false);

  // Initialize WebContainer only once
  useEffect(() => {
    // If WebContainer is already ready, no need to reinitialize
    if (isWebContainerReady) return;

    // If an initialization attempt is in progress, exit
    if (initializingRef.current) return;

    // If we've already tried to initialize, exit
    if (initializationAttemptedRef.current) return;

    // Mark that we've attempted initialization
    initializationAttemptedRef.current = true;
    initializingRef.current = true;

    console.log("🚀 Starting WebContainer initialization...");

    async function initializeWebContainer() {
      try {
        // If WebContainer already exists globally, use it
        if (webcontainerInstance) {
          console.log("Using existing WebContainer instance");
          setIsWebContainerReady(true);
          toast.success("WebContainer ready");
          return;
        }
        console.log("Booting new WebContainer instance");
        // Boot a new WebContainer
        webcontainerInstance = await WebContainer.boot();
        console.log("✅ WebContainer initialized successfully");
        setIsWebContainerReady(true);
        toast.success("WebContainer ready");
      } catch (error) {
        console.error("❌ WebContainer initialization error:", error);
        toast.error(`WebContainer initialization failed: ${error.message}`);
        // Force preview to be available even if WebContainer failed
        // This is a fallback in case WebContainer is not working
        setIsWebContainerReady(true);
      } finally {
        initializingRef.current = false;
      }
    }
    initializeWebContainer();
    // No cleanup needed here, as WebContainer is meant to be global
  }, [isWebContainerReady]);
  useEffect(() => {
    const query = searchParams.get("query");
    if (query) setPrompt(query);
  }, [searchParams]);
  useEffect(() => {
    async function fetchData() {
      if (!prompt) return;
      try {
        console.log("🔍 Fetching template...");
        const template = await fetch("/api/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!template.ok) throw new Error("Failed to fetch template");
        const { prompts, uiPrompts } = await template.json();

        let initialSteps = [];
        let initialFiles = {};
        if (Array.isArray(uiPrompts)) {
          initialSteps = parseXml(uiPrompts[0]);
          setSteps(initialSteps);

          initialFiles = Object.fromEntries(
            initialSteps
              .filter((step) => step.path && step.code)
              .map((step) => [step.path, step.code])
          );
        }
        console.log("📂 Initial Steps:", initialSteps);
        console.log("📁 Initial Files:", initialFiles);
        setFiles(initialFiles);
        setSelectedFile(Object.keys(initialFiles)[0] || null);
        setFileStatus(
          Object.fromEntries(
            Object.keys(initialFiles).map((file) => [file, "pending"])
          )
        );
        console.log("🔍 Fetching chat response...");
        const chatResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...prompts, prompt].toString(),
          }),
        });

        if (!chatResponse.ok) throw new Error("Failed to fetch chat response");
        const chatData = await chatResponse.json();
        console.log("🚀 Chat Response Data:", chatData);
        const rawContent = chatData.response?.content || "";
        const parsedData = parseXml(rawContent);
        console.log("📑 Parsed Data:", parsedData);
        const newSteps = parsedData
          .filter((item) => item.type === 0 && item.path && item.code)
          .map((item) => ({
            title: `Modify ${item.path}`,
            path: item.path,
            code: item.code,
          }));

        console.log("🆕 New Steps Extracted:", newSteps);

        const newFiles = Object.fromEntries(
          newSteps.map((step) => [step.path, step.code])
        );

        console.log("📁 New Files Extracted:", newFiles);

        setSteps((prevSteps) => [...prevSteps, ...newSteps]);
        setFiles((prevFiles) => ({ ...prevFiles, ...newFiles }));
        setSelectedFile(
          (prevSelected) =>
            prevSelected || Object.keys(newFiles)[0] || Object.keys(files)[0]
        );

        setFileStatus((prevStatus) => ({
          ...prevStatus,
          ...Object.fromEntries(
            Object.keys(newFiles).map((file) => [file, "pending"])
          ),
        }));
      } catch (error) {
        console.error("❌ Error:", error);
        toast.error(error.message);
      }
    }
    fetchData();
  }, [prompt]);

  const handleEditorChange = (value) => {
    setContent(value);
    setFiles((prevFiles) => ({
      ...prevFiles,
      [selectedFile]: value,
    }));
  };

  const markAsDone = (file) => {
    setFileStatus((prev) => ({ ...prev, [file]: "done" }));
    setFiles((prevFiles) => ({ ...prevFiles, [file]: content }));
  };

  const getFileLanguage = (fileName) => {
    if (fileName.endsWith(".js")) return "javascript";
    if (fileName.endsWith(".jsx")) return "javascriptreact";
    if (fileName.endsWith(".ts")) return "typescript";
    if (fileName.endsWith(".tsx")) return "typescriptreact";
    if (fileName.endsWith(".json")) return "json";
    if (fileName.endsWith(".html")) return "html";
    if (fileName.endsWith(".css")) return "css";
    return "plaintext"; // Default fallback
  };

  // Helper function to detect project type from files
  const detectProjectType = () => {
    const fileNames = Object.keys(files);

    // Check for package.json to get more info
    const packageJson = files["package.json"];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);

        // Check for specific dependencies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.next) return "nextjs";
        if (deps.react) return "react";
        if (deps.vue) return "vue";
        if (deps.angular) return "angular";
        if (deps.express) return "express";
        if (deps["@nestjs/core"]) return "nest";
      } catch (e) {
        console.error("Error parsing package.json:", e);
      }
    }

    // Check for specific files
    if (fileNames.some((f) => f.includes("next.config.js"))) return "nextjs";
    if (fileNames.some((f) => f.includes("vite.config"))) return "vite";
    if (fileNames.some((f) => f.includes("webpack.config"))) return "webpack";
    if (fileNames.some((f) => f.includes("angular.json"))) return "angular";
    if (fileNames.some((f) => f.includes("app.vue"))) return "vue";
    if (fileNames.some((f) => f.includes("index.html"))) return "static";

    // Default fallback
    return "generic";
  };

  const writeFilesToWebContainer = async () => {
    if (!webcontainerInstance) {
      console.warn(
        "WebContainer not initialized yet, attempting to create mock environment"
      );
      // We'll proceed anyway and try to show a preview even without WebContainer
      return true;
    }

    try {
      // First create a tree structure to properly handle nested directories
      const fileTree = {};

      // Helper function to insert file into the correct place in the tree
      const addToFileTree = (tree, pathParts, content) => {
        const part = pathParts[0];

        if (pathParts.length === 1) {
          // This is a file
          tree[part] = { file: { contents: content } };
        } else {
          // This is a directory
          if (!tree[part]) {
            tree[part] = { directory: {} };
          }
          addToFileTree(tree[part].directory, pathParts.slice(1), content);
        }
      };

      // Build the file tree from actual files
      for (const [path, content] of Object.entries(files)) {
        const pathParts = path.split("/");
        addToFileTree(fileTree, pathParts, content);
      }

      // Make sure we have a package.json if one doesn't exist in the files
      if (!files["package.json"]) {
        const projectType = detectProjectType();
        console.log("📊 Detected project type:", projectType);

        // Create an appropriate package.json based on detected project type
        let packageJson = {};

        switch (projectType) {
          case "nextjs":
            packageJson = {
              name: "nextjs-app",
              version: "0.1.0",
              private: true,
              scripts: {
                dev: "next dev",
                build: "next build",
                start: "next start",
              },
              dependencies: {
                next: "^13.4.1",
                react: "^18.2.0",
                "react-dom": "^18.2.0",
              },
            };
            break;

          case "react":
            packageJson = {
              name: "react-app",
              version: "0.1.0",
              private: true,
              scripts: {
                start: "react-scripts start",
                build: "react-scripts build",
              },
              dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0",
                "react-scripts": "5.0.1",
              },
            };
            break;

          case "express":
            packageJson = {
              name: "express-app",
              version: "0.1.0",
              private: true,
              scripts: {
                start: "node index.js",
                dev: "nodemon index.js",
              },
              dependencies: {
                express: "^4.18.2",
              },
              devDependencies: {
                nodemon: "^2.0.22",
              },
            };
            break;

          case "static":
            packageJson = {
              name: "static-app",
              version: "0.1.0",
              private: true,
              scripts: {
                start: "npx serve .",
              },
              devDependencies: {
                serve: "^14.0.1",
              },
            };
            break;

          default:
            packageJson = {
              name: "webapp",
              version: "0.1.0",
              private: true,
              scripts: {
                start: "npx serve .",
              },
              devDependencies: {
                serve: "^14.0.1",
              },
            };
        }

        // Add the generated package.json to the file tree
        fileTree["package.json"] = {
          file: {
            contents: JSON.stringify(packageJson, null, 2),
          },
        };
      }

      // Make sure we have an index.html for static sites if needed
      if (
        detectProjectType() === "static" &&
        !files.some((f) => f.endsWith(".html"))
      ) {
        fileTree["index.html"] = {
          file: {
            contents: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview App</title>
</head>
<body>
  <div id="app">
    <h1>Preview Application</h1>
    <p>This is a default HTML file created for preview purposes.</p>
  </div>
</body>
</html>
            `,
          },
        };
      }

      // Mount the file tree
      console.log("📁 Writing files to WebContainer:", fileTree);
      await webcontainerInstance.mount(fileTree);
      console.log("✅ Files successfully written to WebContainer");

      return true;
    } catch (error) {
      console.error("❌ Error writing files to WebContainer:", error);
      toast.error("Failed to write files: " + error.message);

      // Return true anyway to allow preview fallback
      return true;
    }
  };

  const debugWebContainerFiles = async () => {
    if (!webcontainerInstance) {
      console.warn("WebContainer not initialized");
      return;
    }

    try {
      // List files at the root
      const rootDir = await webcontainerInstance.fs.readdir("/");
      console.log("Root directory contents:", rootDir);

      // Recursively list all files
      const listFilesRecursively = async (dir = "/") => {
        const entries = await webcontainerInstance.fs.readdir(dir, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const path = `${dir}${dir === "/" ? "" : "/"}${entry.name}`;
          console.log(
            `Found: ${path} (${entry.isDirectory() ? "directory" : "file"})`
          );

          if (entry.isDirectory()) {
            await listFilesRecursively(path);
          } else {
            // For important files, log their content
            if (
              path === "/package.json" ||
              path.includes("index.js") ||
              path.includes("index.html")
            ) {
              const content = await webcontainerInstance.fs.readFile(
                path,
                "utf-8"
              );
              console.log(`Content of ${path}:`, content);
            }
          }
        }
      };

      await listFilesRecursively();
      console.log("File system check complete");
    } catch (error) {
      console.error("Error debugging WebContainer files:", error);
    }
  };

  const startPreview = async () => {
    setIsLoading(true);
    setIsPreviewVisible(false);

    try {
      // Force WebContainer to be ready if it's stuck
      if (!isWebContainerReady) {
        console.log("Forcing WebContainer to be ready");
        setIsWebContainerReady(true);
      }

      // First write all our files to the WebContainer
      const filesWritten = await writeFilesToWebContainer();
      if (!filesWritten) {
        throw new Error("Failed to write files to WebContainer");
      }

      await debugWebContainerFiles();
      toast.success("Files processed");

      // If WebContainer is not available, show a mock preview
      if (!webcontainerInstance) {
        console.log("WebContainer not available, showing mock preview");
        setPreviewURL("about:blank");
        setIsPreviewVisible(true);
        setIsLoading(false);
        toast.success(
          "Preview mode: Showing file content only (WebContainer unavailable)"
        );
        return;
      }

      // Install dependencies
      const installToast = toast.loading("Installing dependencies...");
      console.log("📦 Installing dependencies...");

      try {
        const installProcess = await webcontainerInstance.spawn("npm", [
          "install",
        ]);

        // Monitor the install process
        const installOutput = [];
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("📦 npm install output:", data);
              installOutput.push(data);
            },
          })
        );

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          toast.dismiss(installToast);
          console.error("❌ npm install failed:", installOutput.join("\n"));
          throw new Error(
            `npm install failed with exit code ${installExitCode}`
          );
        }

        toast.dismiss(installToast);
        toast.success("Dependencies installed");
      } catch (error) {
        console.error("Error during npm install:", error);
        toast.dismiss(installToast);
        toast.warning("Dependency installation issue, proceeding anyway");
        // Continue despite npm install issues
      }

      // Determine which command to run based on package.json
      let startCommand = "start";
      let packageJson;

      try {
        if (files["package.json"]) {
          packageJson = JSON.parse(files["package.json"]);
          if (packageJson.scripts) {
            if (packageJson.scripts.dev) {
              startCommand = "dev";
            } else if (packageJson.scripts.serve) {
              startCommand = "serve";
            } else if (packageJson.scripts.start) {
              startCommand = "start";
            }
          }
        }
      } catch (error) {
        console.error("Error parsing package.json:", error);
        // Fallback to default start command
      }

      console.log(`🚀 Using npm run ${startCommand} command`);

      // Start the dev server
      const serverToast = toast.loading(
        `Starting server (npm run ${startCommand})...`
      );
      console.log(`🚀 Starting server with npm run ${startCommand}...`);

      try {
        const devProcess = await webcontainerInstance.spawn("npm", [
          "run",
          startCommand,
        ]);

        // Create a variable to keep track of whether we've found the server URL
        let serverFound = false;

        // Log the process output for debugging
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("📝 Server output:", data);

              // Check for various server ready messages
              const readyPatterns = [
                "ready - started server on",
                "Local:",
                "Server running at",
                "Development Server is listening",
                "Available on:",
                "Serving HTTP on",
              ];

              if (
                readyPatterns.some((pattern) => data.includes(pattern)) &&
                !serverFound
              ) {
                serverFound = true;

                // Try to extract the URL from the output using more flexible pattern
                const urlMatch = data.match(
                  /(https?:\/\/[^:\s]+:(\d+))|((localhost|127\.0\.0\.1):(\d+))/
                );
                if (urlMatch) {
                  let serverUrl;
                  if (urlMatch[1]) {
                    serverUrl = urlMatch[1]; // Full URL with hostname
                  } else if (urlMatch[3]) {
                    const host = urlMatch[3];
                    const port = urlMatch[5];
                    serverUrl = `http://${host}:${port}`;
                  }

                  console.log(`🌐 Server URL: ${serverUrl}`);
                  serverUrlRef.current = serverUrl;
                  setPreviewURL(serverUrl);
                  setIsPreviewVisible(true);
                  setIsLoading(false);
                  toast.dismiss(serverToast);
                  toast.success("Preview server ready!");
                }
              }
            },
          })
        );

        // Set up server-ready listener
        webcontainerInstance.on("server-ready", (port, url) => {
          console.log(`🚀 Server is ready on port ${port} at ${url}`);
          serverUrlRef.current = url;
          setPreviewURL(url);
          setIsPreviewVisible(true);
          setIsLoading(false);
          toast.dismiss(serverToast);
          toast.success("Preview server ready!");
        });

        // Set a timeout in case the server-ready event doesn't fire
        setTimeout(() => {
          if (isLoading && !serverFound) {
            // Try to determine port based on project type
            let fallbackPort = 3000;
            const projectType = detectProjectType();

            if (projectType === "react" || projectType === "vite") {
              fallbackPort = 5173;
            } else if (projectType === "express") {
              fallbackPort = 3000;
            } else if (projectType === "static") {
              fallbackPort = 5000;
            }

            const fallbackUrl = `http://localhost:${fallbackPort}`;
            console.log("⏱️ Timeout reached, using fallback URL:", fallbackUrl);
            serverUrlRef.current = fallbackUrl;
            setPreviewURL(fallbackUrl);
            setIsPreviewVisible(true);
            setIsLoading(false);
            toast.dismiss(serverToast);
            toast.success(`Using default preview URL (port ${fallbackPort})`);
          }
        }, 15000); // 15 seconds timeout
      } catch (error) {
        console.error("Error starting server:", error);
        toast.dismiss(serverToast);

        // Show static HTML preview as fallback
        createFallbackPreview();
      }
    } catch (error) {
      console.error("❌ Preview error:", error);
      toast.error("Failed to start preview: " + error.message);
      setIsLoading(false);

      // Create a fallback preview with file contents
      createFallbackPreview();
    }
  };

  const createFallbackPreview = () => {
    const htmlPreview = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Preview (Fallback Mode)</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; }
          pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow: auto; }
          .file { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; }
          .file-header { background: #eee; padding: 10px; font-weight: bold; border-bottom: 1px solid #ddd; }
          .file-content { padding: 10px; }
        </style>
      </head>
      <body>
        <h1>Preview (Fallback Mode)</h1>
        <p>Could not start the application server. Showing file content instead:</p>
        ${Object.entries(files)
          .map(
            ([path, content]) => `
          <div class="file">
            <div class="file-header">${path}</div>
            <div class="file-content">
              <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
            </div>
          </div>
        `
          )
          .join("")}
      </body>
    </html>
    `;

    const blob = new Blob([htmlPreview], { type: "text/html" });
    const fallbackUrl = URL.createObjectURL(blob);

    setPreviewURL(fallbackUrl);
    setIsPreviewVisible(true);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/4 bg-gray-800 p-4 text-white border-r border-gray-700 overflow-y-auto">
          <h2 className="font-bold mb-3">📝 Steps</h2>
          <ul>
            {steps.map((step, index) => (
              <li key={index} className="p-2 bg-gray-700 rounded-lg mb-2">
                <strong>{step.title || "No title"}</strong>
              </li>
            ))}
          </ul>
        </aside>

        <aside className="w-1/4 bg-gray-900 p-4 text-white border-r border-gray-700 overflow-y-auto">
          <h2 className="font-bold mb-3">📂 Project Files</h2>
          <ul>
            {Object.entries(files).map(([file, content]) => (
              <li
                key={file}
                className={`cursor-pointer p-2 rounded-lg transition-all ${
                  selectedFile === file ? "bg-gray-600" : "hover:bg-gray-700"
                } flex justify-between items-center`}
                onClick={() => setSelectedFile(file)}
              >
                <Folder size={16} className="mr-2" />
                <span className="flex-1 truncate">{file}</span>
                {fileStatus[file] === "done" && (
                  <CheckCircle size={16} className="text-green-500" />
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <button
              className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 ${
                isLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500"
              }`}
              onClick={startPreview}
              disabled={isLoading}
            >
              <Play size={16} />
              {isLoading ? "Starting Preview..." : "Preview Application"}
            </button>
            {!isWebContainerReady && (
              <p className="mt-2 text-xs text-amber-400">
                Note: WebContainer initialization issues detected. Preview will
                show code only.
              </p>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col bg-gray-900 text-white overflow-hidden">
          <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 shadow-md">
            <h2 className="font-bold text-lg">
              📝 Editing: {selectedFile || "Select a file"}
            </h2>
          </header>

          <div className="p-4 flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={getFileLanguage(selectedFile ? selectedFile : "")}
              value={files[selectedFile] || ""}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
              }}
            />
          </div>

          <div className="p-4 border-t border-gray-700">
            {selectedFile && (
              <button
                className="p-2 bg-blue-500 hover:bg-blue-400 rounded-lg"
                onClick={() => markAsDone(selectedFile)}
              >
                ✅ Mark as Done
              </button>
            )}
          </div>
        </div>
      </div>

      {isPreviewVisible && (
        <div className="h-1/2 border-t-2 border-gray-700">
          <div className="flex bg-gray-800 text-white p-2 justify-between items-center">
            <span className="font-medium">📱 Preview: {previewURL}</span>
            <div>
              <button
                className="px-3 py-1 mr-2 bg-blue-500 hover:bg-blue-400 rounded"
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.src = previewURL;
                  }
                }}
              >
                Refresh
              </button>
              <button
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                onClick={() => setIsPreviewVisible(false)}
              >
                Close
              </button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            src={previewURL}
            className="w-full h-full border-none"
            title="Application Preview"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
