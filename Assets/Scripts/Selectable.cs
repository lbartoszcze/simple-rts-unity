using UnityEngine;

public class Selectable : MonoBehaviour
{
    public GameObject ring;

    public void SetSelected(bool selected)
    {
        if (ring != null) ring.SetActive(selected);
    }
}
