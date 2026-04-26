"""
LangGraph workflow that routes agent actions to the appropriate CrewAI agent.

Flow:
  request -> router_node -> [scheduler|notifier|task_manager|availability] -> result
"""

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from .scheduler_agent import run as run_scheduler
from .notifier_agent import run as run_notifier
from .task_agent import run as run_task_manager
from .availability_agent import run as run_availability


class AgentState(TypedDict):
    action: str
    payload: dict
    user_id: int
    result: Any


def _router(state: AgentState) -> str:
    action = state["action"]
    if action in ("schedule_shift", "assign_shift", "detect_gaps"):
        return "scheduler"
    if action in ("send_notification", "alert_team"):
        return "notifier"
    if action in ("create_task", "update_task", "complete_task"):
        return "task_manager"
    if action in ("check_coverage", "flag_conflict"):
        return "availability"
    return "scheduler"  # default


async def _scheduler_node(state: AgentState) -> AgentState:
    state["result"] = await run_scheduler(state["payload"], state["user_id"])
    return state


async def _notifier_node(state: AgentState) -> AgentState:
    state["result"] = await run_notifier(state["payload"], state["user_id"])
    return state


async def _task_manager_node(state: AgentState) -> AgentState:
    state["result"] = await run_task_manager(state["payload"], state["user_id"])
    return state


async def _availability_node(state: AgentState) -> AgentState:
    state["result"] = await run_availability(state["payload"], state["user_id"])
    return state


# Build the graph
workflow = StateGraph(AgentState)
workflow.add_node("scheduler", _scheduler_node)
workflow.add_node("notifier", _notifier_node)
workflow.add_node("task_manager", _task_manager_node)
workflow.add_node("availability", _availability_node)

workflow.set_conditional_entry_point(
    _router,
    {
        "scheduler": "scheduler",
        "notifier": "notifier",
        "task_manager": "task_manager",
        "availability": "availability",
    },
)

for node in ("scheduler", "notifier", "task_manager", "availability"):
    workflow.add_edge(node, END)

compiled_graph = workflow.compile()


async def run_agent_workflow(action: str, payload: dict, user_id: int) -> Any:
    state: AgentState = {"action": action, "payload": payload, "user_id": user_id, "result": None}
    final_state = await compiled_graph.ainvoke(state)
    return final_state["result"]
