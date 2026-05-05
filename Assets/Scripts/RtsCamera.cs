using UnityEngine;

public class RtsCamera : MonoBehaviour
{
    public float panSpeed = 25f;
    public float edgePad = 12f;
    public float zoomSpeed = 800f;
    public float minY = 10f;
    public float maxY = 70f;

    void Update()
    {
        Vector3 p = transform.position;

        if (Input.mousePosition.x >= Screen.width - edgePad || Input.GetKey(KeyCode.D))
            p.x += panSpeed * Time.deltaTime;
        if (Input.mousePosition.x <= edgePad || Input.GetKey(KeyCode.A))
            p.x -= panSpeed * Time.deltaTime;
        if (Input.mousePosition.y >= Screen.height - edgePad || Input.GetKey(KeyCode.W))
            p.z += panSpeed * Time.deltaTime;
        if (Input.mousePosition.y <= edgePad || Input.GetKey(KeyCode.S))
            p.z -= panSpeed * Time.deltaTime;

        p.y -= Input.mouseScrollDelta.y * zoomSpeed * Time.deltaTime;
        p.y = Mathf.Clamp(p.y, minY, maxY);

        transform.position = p;
    }
}
