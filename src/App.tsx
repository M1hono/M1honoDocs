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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 组件挂载时自动加载预构建数据
    useEffect(() => {
        loadPrebuiltData();
    }, []);

    /**
     * 加载预构建的JavaDoc数据
     */
    const loadPrebuiltData = async () => {
        setLoading(true);
        setError("");
        setDocIndex(null);

        try {
            const loader = new PrebuiltDataLoader();

            console.log("📁 Loading prebuilt Minecraft/Forge JavaDoc data...");

            // 加载预构建的项目数据
            const result = await loader.loadProjectIndex();

            // 将loader实例保存到docIndex中以便其他组件使用
            (result as any).dataLoader = loader;
            setDocIndex(result);

            console.log(`✅ Prebuilt data loaded successfully: ${result.totalPackages} packages, ${result.totalClasses} classes`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("❌ Failed to load prebuilt data:", err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App" style={{ height: "100vh", overflow: "hidden" }}>
            <JavaDocRouter
                docIndex={docIndex}
                loading={loading}
                error={error}
                onRegenerate={loadPrebuiltData}
            />
        </div>
    );
}

export default App;
 