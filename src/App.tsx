import React, { useState, useEffect } from "react";
import { JavaDocRouter } from "./components/JavaDocRouter";
import { PrebuiltDataLoader } from "./utils/prebuiltDataLoader";
import { ProjectDocIndex } from "./types";
import "./index.css";

/**
 * 主应用程序
 * 基于路由的 JavaDoc 浏览器
 */
function App() {
    const [docIndex, setDocIndex] = useState<ProjectDocIndex | null>(null);
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState("");
    const [availableVersions, setAvailableVersions] = useState<string[]>([]);
    const [currentVersion, setCurrentVersion] = useState<string>("");

    // Fetch available versions on mount
    useEffect(() => {
        const fetchVersions = async () => {
            try {
                // Assuming versions.json is in the public root
                const response = await fetch("/versions.json");
                if (!response.ok) {
                    throw new Error("versions.json not found");
                }
                const versions = await response.json();
                setAvailableVersions(versions);
                // Set the latest version as the default
                if (versions.length > 0) {
                    const latestVersion = versions[0];
                    setCurrentVersion(latestVersion);
                    // Automatically load data for the default version
                    loadPrebuiltData(latestVersion);
                } else {
                    throw new Error("No versions found in versions.json");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                console.error("❌ Failed to load versions:", err);
                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchVersions();
    }, []); // Empty dependency array means this runs once on mount

    /**
     * Loads prebuilt JavaDoc data for a specific version.
     * @param version The version to load.
     */
    const loadPrebuiltData = async (version: string) => {
        setLoading(true);
        setError("");
        setDocIndex(null);

        try {
            // Pass the version to the data loader
            const loader = new PrebuiltDataLoader(version);

            console.log(`📁 Loading prebuilt data for version ${version}...`);

            const result = await loader.loadProjectIndex();
            (result as any).dataLoader = loader;
            setDocIndex(result);

            console.log(`✅ Data loaded successfully for ${version}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error(`❌ Failed to load data for version ${version}:`, err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const handleVersionChange = (version: string) => {
        setCurrentVersion(version);
        loadPrebuiltData(version);
    }

    return (
        <div className="App" style={{ height: "100vh", overflow: "hidden" }}>
            <JavaDocRouter
                docIndex={docIndex}
                loading={loading}
                error={error}
                onRegenerate={() => loadPrebuiltData(currentVersion)}
                // Version props
                availableVersions={availableVersions}
                currentVersion={currentVersion}
                onVersionChange={handleVersionChange}
            />
        </div>
    );
}

export default App;
