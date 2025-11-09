<script lang="ts">
	let { size = 32, mode = 'light', hovered = false } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="transition-all duration-300"
>
	<!-- Cross with Catholic styling -->
	<g class="transition-all duration-300 {hovered ? 'scale-110' : 'scale-100'}">
		<!-- Vertical bar -->
		<rect
			x="13"
			y="4"
			width="6"
			height="24"
			fill={mode === 'light' ? 'var(--color-navy)' : 'white'}
			class="transition-colors duration-300"
		/>
		<!-- Horizontal bar -->
		<rect
			x="8"
			y="11"
			width="16"
			height="6"
			fill={mode === 'light' ? 'var(--color-navy)' : 'white'}
			class="transition-colors duration-300"
		/>
		<!-- Decorative circle at center -->
		<circle
			cx="16"
			cy="14"
			r="3"
			fill={mode === 'light' ? 'var(--color-gold)' : 'var(--color-cream)'}
			class="transition-colors duration-300"
		/>
	</g>
</svg>

<style>
	svg {
		transform-origin: center;
	}
</style>
