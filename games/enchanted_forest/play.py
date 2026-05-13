#!/usr/bin/env python3
"""Enchanted Forest — console adventure (scene engine). Run: python play.py"""

from __future__ import annotations

from engine import GameEngine, get_choice
from story_data import build_scenes


def banner() -> None:
    print("=" * 60)
    print(" ENCHANTED FOREST ADVENTURE ".center(60))
    print("=" * 60)


def summarize_run(ending: str | None, history: list[str], inventory: list[str]) -> None:
    print("\n" + "=" * 60)
    print("SESSION SUMMARY")
    print("=" * 60)
    print(f"Ending tag:     {ending or '-'}")
    print(f"Scenes visited: {' → '.join(history)}")
    print(f"Inventory:      {', '.join(inventory) if inventory else '(none)'}")
    print("=" * 60)


def main() -> None:
    scenes = build_scenes()
    engine = GameEngine(scenes, start="intro")

    while True:
        banner()
        state = engine.run()
        summarize_run(state.ending, state.history, state.inventory)

        again = get_choice("\nPlay again? (y/n): ", {"y", "n"})
        if again != "y":
            print("\nGoodbye, adventurer.\n")
            break
        print()


if __name__ == "__main__":
    main()
