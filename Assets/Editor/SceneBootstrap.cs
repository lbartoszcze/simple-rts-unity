#if UNITY_EDITOR
using System.IO;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;

[InitializeOnLoad]
public static class SceneBootstrap
{
    const string ScenePath = "Assets/Scenes/Main.unity";
    const string MarkerPath = "Assets/Scenes/.bootstrapped";

    static SceneBootstrap()
    {
        EditorApplication.delayCall += MaybeBuild;
    }

    [MenuItem("Tools/RTS/Rebuild Demo Scene")]
    public static void Rebuild()
    {
        if (File.Exists(MarkerPath)) File.Delete(MarkerPath);
        Build();
    }

    static void MaybeBuild()
    {
        if (File.Exists(ScenePath) || File.Exists(MarkerPath)) return;
        Build();
    }

    static void Build()
    {
        EnsureLayer("Ground", 8);
        EnsureLayer("Unit", 9);

        Directory.CreateDirectory("Assets/Scenes");
        Directory.CreateDirectory("Assets/Prefabs");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.localScale = new Vector3(10f, 1f, 10f);
        ground.layer = LayerMask.NameToLayer("Ground");
        var groundMat = new Material(Shader.Find("Standard"));
        groundMat.color = new Color(0.32f, 0.46f, 0.30f);
        AssetDatabase.CreateAsset(groundMat, "Assets/Prefabs/Ground.mat");
        ground.GetComponent<MeshRenderer>().sharedMaterial = groundMat;

        var surface = ground.AddComponent<NavMeshSurface>();
        surface.collectObjects = CollectObjects.All;
        surface.BuildNavMesh();

        var lightGO = new GameObject("Directional Light");
        lightGO.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        var light = lightGO.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.0f;
        light.shadows = LightShadows.Soft;

        var rig = new GameObject("CameraRig");
        rig.transform.position = new Vector3(0f, 40f, -25f);
        rig.transform.rotation = Quaternion.Euler(55f, 0f, 0f);
        rig.AddComponent<RtsCamera>();

        var camGO = new GameObject("Main Camera");
        camGO.tag = "MainCamera";
        camGO.transform.SetParent(rig.transform, false);
        var cam = camGO.AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.Skybox;
        cam.fieldOfView = 60f;
        camGO.AddComponent<AudioListener>();

        var ctrlGO = new GameObject("RtsController");
        var ctrl = ctrlGO.AddComponent<RtsController>();
        ctrl.groundMask = 1 << LayerMask.NameToLayer("Ground");
        ctrl.unitMask = 1 << LayerMask.NameToLayer("Unit");

        var ringMat = new Material(Shader.Find("Standard"));
        ringMat.color = new Color(0.20f, 0.95f, 1.0f);
        ringMat.EnableKeyword("_EMISSION");
        ringMat.SetColor("_EmissionColor", new Color(0.20f, 0.95f, 1.0f) * 1.2f);
        AssetDatabase.CreateAsset(ringMat, "Assets/Prefabs/SelectionRing.mat");

        var unitMat = new Material(Shader.Find("Standard"));
        unitMat.color = new Color(0.85f, 0.30f, 0.25f);
        AssetDatabase.CreateAsset(unitMat, "Assets/Prefabs/Unit.mat");

        var spacing = 2.4f;
        var cols = 4;
        var rows = 3;
        for (int i = 0; i < cols * rows; i++)
        {
            int row = i / cols;
            int col = i % cols;
            float x = (col - (cols - 1) * 0.5f) * spacing;
            float z = (row - (rows - 1) * 0.5f) * spacing;
            SpawnUnit(new Vector3(x, 1f, z), unitMat, ringMat);
        }

        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

        File.WriteAllText(MarkerPath, "ok");
        AssetDatabase.Refresh();

        Debug.Log("[SceneBootstrap] Demo scene built at " + ScenePath + ". Press Play.");
    }

    static void SpawnUnit(Vector3 pos, Material body, Material ringMat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        go.name = "Unit";
        go.layer = LayerMask.NameToLayer("Unit");
        go.transform.position = pos;
        go.GetComponent<MeshRenderer>().sharedMaterial = body;

        var agent = go.AddComponent<NavMeshAgent>();
        agent.radius = 0.4f;
        agent.height = 2.0f;
        agent.speed = 6.0f;
        agent.acceleration = 20f;
        agent.angularSpeed = 720f;
        agent.stoppingDistance = 0.2f;

        go.AddComponent<Unit>();
        var sel = go.AddComponent<Selectable>();

        var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        ring.name = "SelectionRing";
        ring.transform.SetParent(go.transform, false);
        ring.transform.localScale = new Vector3(1.4f, 0.02f, 1.4f);
        ring.transform.localPosition = new Vector3(0f, -0.95f, 0f);
        Object.DestroyImmediate(ring.GetComponent<Collider>());
        ring.GetComponent<MeshRenderer>().sharedMaterial = ringMat;
        ring.SetActive(false);
        sel.ring = ring;
    }

    static void EnsureLayer(string layerName, int index)
    {
        var asset = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset");
        if (asset == null || asset.Length == 0) return;
        var so = new SerializedObject(asset[0]);
        var layers = so.FindProperty("layers");
        if (layers == null || index >= layers.arraySize) return;
        var prop = layers.GetArrayElementAtIndex(index);
        if (prop.stringValue != layerName)
        {
            prop.stringValue = layerName;
            so.ApplyModifiedProperties();
        }
    }
}
#endif
