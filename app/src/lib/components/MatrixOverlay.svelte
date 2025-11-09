<script lang="ts">
	let {
		layout = 'full',
		width = '100%',
		size = 20,
		cellColor = 'var(--color-light-gray)',
		children
	}: {
		layout?: 'full' | 'bottom';
		width?: string;
		size?: number;
		cellColor?: string;
		children?: any;
	} = $props();
</script>

<div
	class="relative overflow-hidden"
	style="width: {width}; height: {layout === 'full' ? '100vh' : 'auto'};"
>
	<!-- Grid pattern background -->
	<div
		class="absolute inset-0 opacity-10"
		style="
			background-image:
				linear-gradient(to right, {cellColor} 1px, transparent 1px),
				linear-gradient(to bottom, {cellColor} 1px, transparent 1px);
			background-size: {size}px {size}px;
		"
	></div>

	<!-- Content -->
	<div class="relative z-10">
		{@render children?.()}
	</div>
</div>
