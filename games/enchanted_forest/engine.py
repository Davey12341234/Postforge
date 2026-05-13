"""
Minimal scene engine: data-driven scenes, validated input, no recursive retries.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal


def get_choice(prompt: str, valid: set[str]) -> str:
    """Prompt until the user enters a valid choice."""
    valid_display = ", ".join(sorted(valid))
    while True:
        raw = input(prompt).strip()
        if raw in valid:
            return raw
        print(f"Invalid choice. Please enter one of: {valid_display}")


@dataclass
class PlayerState:
    health: int = 3
    inventory: list[str] = field(default_factory=list)
    history: list[str] = field(default_factory=list)
    ending: str | None = None  # tag when game ends


Effect = dict[str, Any]
SceneId = str


@dataclass
class Choice:
    key: str
    label: str
    next_scene: SceneId
    effects: list[Effect] = field(default_factory=list)


@dataclass
class Scene:
    scene_id: SceneId
    text: str
    choices: list[Choice]
    kind: Literal["normal", "ending"] = "normal"
    ending_tag: str | None = None


def apply_effects(state: PlayerState, effects: list[Effect]) -> None:
    for e in effects:
        if "add_item" in e:
            item = str(e["add_item"])
            if item not in state.inventory:
                state.inventory.append(item)
        if "remove_item" in e:
            item = str(e["remove_item"])
            if item in state.inventory:
                state.inventory.remove(item)
        if "damage" in e:
            state.health = max(0, state.health - int(e["damage"]))
        if "heal" in e:
            state.health += int(e["heal"])


def format_scene_text(scene: Scene, state: PlayerState) -> str:
    inv = ", ".join(state.inventory) if state.inventory else "(empty)"
    hp = state.health
    lines = [
        scene.text.strip(),
        "",
        f"[Health: {hp} | Inventory: {inv}]",
        "",
    ]
    for c in scene.choices:
        lines.append(f"  {c.key}. {c.label}")
    return "\n".join(lines)


class GameEngine:
    def __init__(
        self,
        scenes: dict[SceneId, Scene],
        start: SceneId,
        *,
        on_scene_enter: Callable[[SceneId, PlayerState], None] | None = None,
    ) -> None:
        self.scenes = scenes
        self.start = start
        self.on_scene_enter = on_scene_enter

    def run(self) -> PlayerState:
        state = PlayerState()
        current: SceneId | None = self.start

        while current is not None:
            scene = self.scenes.get(current)
            if scene is None:
                print(f"[Engine error: unknown scene '{current}']")
                break

            state.history.append(current)
            if self.on_scene_enter:
                self.on_scene_enter(current, state)

            print()
            print("-" * 56)
            print(format_scene_text(scene, state))

            if scene.kind == "ending":
                state.ending = scene.ending_tag
                break

            valid = {c.key for c in scene.choices}
            prompt = f"Your choice ({'/'.join(sorted(valid))}): "
            pick = get_choice(prompt, valid)

            chosen = next(c for c in scene.choices if c.key == pick)
            apply_effects(state, chosen.effects)
            current = chosen.next_scene

            if state.health <= 0:
                dead = self.scenes.get("ending_defeat")
                if dead:
                    state.history.append("ending_defeat")
                    print("\n" + dead.text)
                    state.ending = dead.ending_tag or "defeat"
                break

        return state
