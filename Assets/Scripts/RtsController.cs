using System.Collections.Generic;
using UnityEngine;

public class RtsController : MonoBehaviour
{
    public LayerMask groundMask;
    public LayerMask unitMask;
    public float formationSpacing = 2f;
    public float clickDragThreshold = 5f;

    readonly List<Selectable> _selected = new List<Selectable>();
    Vector2 _dragStart;
    bool _dragging;

    void Update()
    {
        Camera cam = Camera.main;
        if (cam == null) return;

        if (Input.GetMouseButtonDown(0))
        {
            _dragStart = Input.mousePosition;
            _dragging = true;
        }

        if (Input.GetMouseButtonUp(0) && _dragging)
        {
            _dragging = false;
            HandleSelection(cam, _dragStart, Input.mousePosition);
        }

        if (Input.GetMouseButtonDown(1))
        {
            HandleMoveOrder(cam);
        }
    }

    void HandleSelection(Camera cam, Vector2 a, Vector2 b)
    {
        ClearSelection();

        if ((a - b).sqrMagnitude < clickDragThreshold * clickDragThreshold)
        {
            Ray ray = cam.ScreenPointToRay(b);
            if (Physics.Raycast(ray, out RaycastHit hit, 1000f, unitMask))
            {
                Select(hit.collider.GetComponentInParent<Selectable>());
            }
            return;
        }

        Vector2 min = Vector2.Min(a, b);
        Vector2 max = Vector2.Max(a, b);
        foreach (Selectable s in Object.FindObjectsByType<Selectable>(FindObjectsSortMode.None))
        {
            Vector3 sp = cam.WorldToScreenPoint(s.transform.position);
            if (sp.z < 0f) continue;
            if (sp.x >= min.x && sp.x <= max.x && sp.y >= min.y && sp.y <= max.y)
                Select(s);
        }
    }

    void HandleMoveOrder(Camera cam)
    {
        if (_selected.Count == 0) return;

        Ray ray = cam.ScreenPointToRay(Input.mousePosition);
        if (!Physics.Raycast(ray, out RaycastHit hit, 1000f, groundMask)) return;

        Vector3 center = hit.point;
        Vector3 forward = Vector3.forward;
        if (_selected.Count > 0)
        {
            Vector3 group = Vector3.zero;
            foreach (Selectable s in _selected) group += s.transform.position;
            group /= _selected.Count;
            Vector3 d = center - group;
            d.y = 0f;
            if (d.sqrMagnitude > 0.01f) forward = d.normalized;
        }

        Vector3 right = Vector3.Cross(Vector3.up, forward);
        int cols = Mathf.CeilToInt(Mathf.Sqrt(_selected.Count));

        for (int i = 0; i < _selected.Count; i++)
        {
            int row = i / cols;
            int col = i % cols;
            float ox = (col - (cols - 1) * 0.5f) * formationSpacing;
            float oz = -row * formationSpacing;
            Vector3 slot = center + right * ox + forward * oz;

            Unit unit = _selected[i].GetComponent<Unit>();
            if (unit != null) unit.MoveTo(slot);
        }
    }

    void Select(Selectable s)
    {
        if (s == null || _selected.Contains(s)) return;
        s.SetSelected(true);
        _selected.Add(s);
    }

    void ClearSelection()
    {
        foreach (Selectable s in _selected) s.SetSelected(false);
        _selected.Clear();
    }

    void OnGUI()
    {
        if (!_dragging) return;
        Vector2 cur = Input.mousePosition;
        Rect r = Rect.MinMaxRect(
            Mathf.Min(_dragStart.x, cur.x),
            Screen.height - Mathf.Max(_dragStart.y, cur.y),
            Mathf.Max(_dragStart.x, cur.x),
            Screen.height - Mathf.Min(_dragStart.y, cur.y));
        GUI.Box(r, GUIContent.none);
    }
}
