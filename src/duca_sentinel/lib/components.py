"""
Helpers for Components V2 messages.

Discord's V2 component tree replaces `content`/`embeds` entirely, and discord.py only serialises
it when the top-level items are attached to a `LayoutView`. `ContainerView` is that attachment
point: builders elsewhere return bare containers, and this wraps them at the point of sending.
"""

from discord import ui


class ContainerView(ui.LayoutView):
	"""Carries pre-built top-level Components V2 items on an outgoing message."""

	def __init__(self, *items: ui.Item) -> None:
		# These messages only ever carry link buttons, so nothing waits on an interaction.
		super().__init__(timeout=None)
		for item in items:
			self.add_item(item)
