"""Story content: scenes as data — add new scenes without new functions."""

from __future__ import annotations

from engine import Choice, Scene

# Scene ids are strings; add new branches by pointing `next_scene` to new ids.


def build_scenes() -> dict[str, Scene]:
    return {
        "intro": Scene(
            scene_id="intro",
            text=(
                "You find yourself at the edge of a mysterious forest.\n"
                "Legends say it is enchanted and filled with magical creatures.\n"
                "Do you dare to explore?"
            ),
            choices=[
                Choice("1", "Enter the forest", "fork_paths"),
                Choice("2", "Turn back home", "ending_home"),
            ],
        ),
        "fork_paths": Scene(
            scene_id="fork_paths",
            text=(
                "You walk deeper into the forest. Two paths appear:\n"
                "one mossy trail to the left, a sunlit glade to the right."
            ),
            choices=[
                Choice("1", "Take the left path", "owl_riddle"),
                Choice("2", "Take the right path", "fairy_encounter"),
            ],
        ),
        "owl_riddle": Scene(
            scene_id="owl_riddle",
            text=(
                "A wise old owl blocks a hollow tree.\n\n"
                '"I speak without a mouth and hear without ears.\n'
                'I have no body, but I come alive with the wind. What am I?"'
            ),
            choices=[
                Choice(
                    "1",
                    "An Echo",
                    "ending_wise",
                    effects=[{"add_item": "magical feather"}],
                ),
                Choice("2", "A Shadow", "ending_wrong_riddle"),
            ],
        ),
        "fairy_encounter": Scene(
            scene_id="fairy_encounter",
            text=(
                "A mischievous fairy zips around you, leaving trails of glitter.\n"
                "She grins, waiting for your move."
            ),
            choices=[
                Choice(
                    "1",
                    "Try to befriend the fairy",
                    "ending_good_fairy",
                    effects=[{"add_item": "fairy dust"}],
                ),
                Choice(
                    "2",
                    "Challenge her to a contest",
                    "ending_lost",
                    effects=[{"damage": 1}],
                ),
            ],
        ),
        "ending_home": Scene(
            scene_id="ending_home",
            text="You turn away from the trees. The forest hums behind you, unvisited.",
            choices=[],
            kind="ending",
            ending_tag="cautious_end",
        ),
        "ending_wise": Scene(
            scene_id="ending_wise",
            text=(
                "Correct! The owl dips its head and drops a glowing feather into your hand.\n"
                "It feels warm - perhaps it will help you another day."
            ),
            choices=[],
            kind="ending",
            ending_tag="wise",
        ),
        "ending_wrong_riddle": Scene(
            scene_id="ending_wrong_riddle",
            text="The owl clicks its beak, spreads its wings, and vanishes into the canopy.",
            choices=[],
            kind="ending",
            ending_tag="humbled",
        ),
        "ending_good_fairy": Scene(
            scene_id="ending_good_fairy",
            text=(
                "The fairy claps her hands. Sparkling dust settles on your shoulders.\n"
                "She whispers a safe route through the undergrowth before darting away."
            ),
            choices=[],
            kind="ending",
            ending_tag="good",
        ),
        "ending_lost": Scene(
            scene_id="ending_lost",
            text=(
                "The fairy laughs like wind chimes - and is gone.\n"
                "The trees close in; every path looks the same."
            ),
            choices=[],
            kind="ending",
            ending_tag="lost",
        ),
        "ending_defeat": Scene(
            scene_id="ending_defeat",
            text="You collapse, exhausted. The forest claims another wanderer…",
            choices=[],
            kind="ending",
            ending_tag="defeat",
        ),
    }
