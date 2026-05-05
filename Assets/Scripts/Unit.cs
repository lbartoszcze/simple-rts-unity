using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class Unit : MonoBehaviour
{
    public int team = 0;

    NavMeshAgent _agent;

    void Awake()
    {
        _agent = GetComponent<NavMeshAgent>();
    }

    public void MoveTo(Vector3 destination)
    {
        if (_agent != null && _agent.isOnNavMesh)
            _agent.SetDestination(destination);
    }

    public void Stop()
    {
        if (_agent != null && _agent.isOnNavMesh)
            _agent.ResetPath();
    }
}
