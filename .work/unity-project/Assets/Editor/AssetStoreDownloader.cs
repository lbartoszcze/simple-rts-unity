// Editor-side script that programmatically triggers an Asset Store download
// for productId 314095 (Low Poly Axe Warrior). Uses reflection on
// UnityEditor.PackageManager.UI.Internal.AssetStoreDownloadManager because
// the public API surface for asset-store ops is hidden inside Internal.
//
// Auto-runs on Editor startup via [InitializeOnLoad]. Also exposes a menu
// item "Tools/ASD Download Axe Warrior" for manual invocation.

using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

public static class AssetStoreDownloaderBootstrap {
    [InitializeOnLoadMethod]
    static void Init() {
        Debug.Log("[ASD] InitializeOnLoadMethod fired");
        startedAt = -1;
        EditorApplication.update += DelayedRun;
    }
    static double startedAt = -1;
    static void DelayedRun() {
        if (startedAt < 0) {
            startedAt = EditorApplication.timeSinceStartup;
            Debug.Log($"[ASD] DelayedRun starts at {startedAt:F2}");
        }
        if (EditorApplication.timeSinceStartup - startedAt < 8) return;
        EditorApplication.update -= DelayedRun;
        Debug.Log("[ASD] settle complete — invoking Run");
        AssetStoreDownloader.Run();
    }
}

public static class AssetStoreDownloader {
    // Product ID is read from the ASD_PRODUCT_ID env var so the same Editor
    // script can fetch any Asset Store package without a recompile. Falls back
    // to 314095 (Low Poly Axe Warrior) if the var is unset.
    static long ProductId() {
        var s = Environment.GetEnvironmentVariable("ASD_PRODUCT_ID");
        if (!string.IsNullOrEmpty(s) && long.TryParse(s.Trim(), out var v)) return v;
        return 314095L;
    }

    [MenuItem("Tools/ASD Download Asset")]
    public static void Run() {
        try {
            long productId = ProductId();
            Debug.Log($"[ASD] starting download for productId={productId}");

            // First, open the Package Manager window so its internal services
            // bootstrap. ServicesContainer.instance.Resolve<T>() returns null
            // until the PM UI has been instantiated at least once.
            Debug.Log("[ASD] opening Package Manager via UnityEditor.PackageManager.UI.Window.Open");
            try {
                Type windowType = Type.GetType("UnityEditor.PackageManager.UI.Window, UnityEditor")
                                 ?? Type.GetType("UnityEditor.PackageManager.UI.PackageManagerWindow, UnityEditor");
                if (windowType == null) {
                    foreach (var asm in AppDomain.CurrentDomain.GetAssemblies()) {
                        windowType = asm.GetType("UnityEditor.PackageManager.UI.Window")
                                  ?? asm.GetType("UnityEditor.PackageManager.UI.PackageManagerWindow")
                                  ?? asm.GetType("UnityEditor.PackageManager.UI.Internal.PackageManagerWindow");
                        if (windowType != null) break;
                    }
                }
                if (windowType != null) {
                    var openM = windowType.GetMethod("Open", BindingFlags.Public | BindingFlags.Static, null,
                                                     new[] { typeof(string) }, null);
                    if (openM != null) {
                        openM.Invoke(null, new object[] { productId.ToString() });
                        Debug.Log("[ASD] Window.Open invoked");
                    } else {
                        // ExecuteMenuItem is the fallback.
                        EditorApplication.ExecuteMenuItem("Window/Package Manager");
                        Debug.Log("[ASD] menu Window/Package Manager executed");
                    }
                } else {
                    EditorApplication.ExecuteMenuItem("Window/Package Manager");
                }
            } catch (Exception e) { Debug.LogWarning($"[ASD] window open path: {e.Message}"); }

            // Give PM 4 seconds to boot before reflecting into ServicesContainer.
            startedSettleAt = -1;
            EditorApplication.update += SettleAndDownload;
            Debug.Log("[ASD] subscribed SettleAndDownload to EditorApplication.update");
        } catch (Exception e) {
            Debug.LogError($"[ASD] exception: {e}");
        }
    }

    static double startedSettleAt = -1;
    static void SettleAndDownload() {
        if (startedSettleAt < 0) {
            startedSettleAt = EditorApplication.timeSinceStartup;
            Debug.Log($"[ASD] SettleAndDownload first tick at {startedSettleAt:F2}");
        }
        if (EditorApplication.timeSinceStartup - startedSettleAt < 6) return;
        EditorApplication.update -= SettleAndDownload;
        Debug.Log("[ASD] settle elapsed — DoDownload");
        DoDownload(ProductId());
    }

    static void DoDownload(long productId) {
        try {
            Type managerType = null;
            foreach (var asm in AppDomain.CurrentDomain.GetAssemblies()) {
                managerType = asm.GetType("UnityEditor.PackageManager.UI.Internal.AssetStoreDownloadManager", false);
                if (managerType != null) {
                    Debug.Log($"[ASD] found AssetStoreDownloadManager in {asm.GetName().Name}");
                    break;
                }
            }
            if (managerType == null) {
                Debug.LogError("[ASD] AssetStoreDownloadManager type not found");
                return;
            }

            Type containerType = null;
            foreach (var asm in AppDomain.CurrentDomain.GetAssemblies()) {
                containerType = asm.GetType("UnityEditor.PackageManager.UI.Internal.ServicesContainer", false);
                if (containerType != null) break;
            }
            if (containerType == null) {
                Debug.LogError("[ASD] ServicesContainer type not found");
                return;
            }
            // Dump everything we can about ServicesContainer so we can see how
            // to obtain the singleton in this Unity version.
            object instance = null;
            var allFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance;
            Debug.Log($"[ASD] ServicesContainer members:");
            foreach (var m in containerType.GetMembers(allFlags)) {
                Debug.Log($"  {m.MemberType} {m.Name}");
            }
            // Try a few likely accessors.
            foreach (var name in new[] { "instance", "Instance", "GetInstance", "Get" }) {
                var prop = containerType.GetProperty(name, allFlags);
                if (prop != null) {
                    try { instance = prop.GetValue(null); } catch { }
                    if (instance != null) { Debug.Log($"[ASD] got instance via property '{name}'"); break; }
                }
                var field = containerType.GetField(name, allFlags);
                if (field != null) {
                    try { instance = field.GetValue(null); } catch { }
                    if (instance != null) { Debug.Log($"[ASD] got instance via field '{name}'"); break; }
                }
                var method = containerType.GetMethod(name, allFlags, null, Type.EmptyTypes, null);
                if (method != null) {
                    try { instance = method.Invoke(null, null); } catch { }
                    if (instance != null) { Debug.Log($"[ASD] got instance via method '{name}()'"); break; }
                }
            }
            // Fall back: instantiate (it might be a normal class with parameterless ctor).
            if (instance == null) {
                try {
                    instance = Activator.CreateInstance(containerType);
                    if (instance != null) Debug.Log("[ASD] instantiated ServicesContainer via Activator.CreateInstance");
                } catch (Exception e) {
                    Debug.LogWarning($"[ASD] CreateInstance failed: {e.Message}");
                }
            }
            if (instance == null) {
                Debug.LogError("[ASD] couldn't obtain ServicesContainer instance via any path");
                return;
            }

            // Resolve<T>() generic method
            var resolveGeneric = containerType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name == "Resolve" && m.IsGenericMethodDefinition && m.GetParameters().Length == 0);
            if (resolveGeneric == null) {
                Debug.LogError("[ASD] Resolve<T>() generic method not found; available:");
                foreach (var m in containerType.GetMethods(BindingFlags.Public | BindingFlags.Instance))
                    Debug.Log($"  {m.Name}<{m.IsGenericMethodDefinition}>({string.Join(",", m.GetParameters().Select(p => p.ParameterType.Name))})");
                return;
            }
            var resolveT = resolveGeneric.MakeGenericMethod(managerType);
            var manager = resolveT.Invoke(instance, null);
            if (manager == null) {
                Debug.LogError("[ASD] Resolve<AssetStoreDownloadManager> returned null");
                return;
            }
            Debug.Log($"[ASD] resolved manager: {manager.GetType().FullName}");

            var methods = managerType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
            Debug.Log("[ASD] Download* methods:");
            foreach (var m in methods.Where(m => m.Name.IndexOf("Download", StringComparison.OrdinalIgnoreCase) >= 0)) {
                Debug.Log($"  {m.Name}({string.Join(", ", m.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name))})");
            }

            MethodInfo downloadM = methods.FirstOrDefault(m => m.Name == "Download" && m.GetParameters().Length == 1 && m.GetParameters()[0].ParameterType == typeof(long));
            if (downloadM == null) downloadM = methods.FirstOrDefault(m => m.Name == "Download" && m.GetParameters().Length == 1);
            if (downloadM == null) {
                Debug.LogError("[ASD] no Download method found");
                return;
            }
            object arg = downloadM.GetParameters()[0].ParameterType == typeof(long) ? (object)productId : (object)productId.ToString();
            Debug.Log($"[ASD] invoking {downloadM.Name}({arg.GetType().Name}) with {arg}");
            var ret = downloadM.Invoke(manager, new[] { arg });
            Debug.Log($"[ASD] Download returned: {ret}");

            // Poll
            EditorApplication.delayCall += () => Task.Run(() => PollForPackage(productId, 180));
        } catch (Exception e) {
            Debug.LogError($"[ASD] DoDownload exception: {e}");
        }
    }

    static void PollForPackage(long productId, int maxSeconds) {
        var basePaths = new[] {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library/Unity/Asset Store-5.x"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library/Unity/cache"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library/Unity"),
            "/tmp",
        };
        for (int i = 0; i < maxSeconds; i++) {
            foreach (var p in basePaths) {
                if (!Directory.Exists(p)) continue;
                try {
                    var files = Directory.GetFiles(p, "*.unitypackage", SearchOption.AllDirectories);
                    if (files.Length > 0) {
                        Debug.Log($"[ASD] FOUND {files.Length} unitypackage(s):");
                        foreach (var f in files) Debug.Log($"[ASD]   {f}");
                        return;
                    }
                } catch { }
            }
            Task.Delay(1000).Wait();
        }
        Debug.LogWarning("[ASD] timeout waiting for unitypackage");
    }
}
