<script lang="ts">
	let {
		type = 'button',
		href = '',
		text,
		variant = 'filled',
		icon = '',
		target = '_self',
		onclick = () => {}
	}: {
		type?: 'button' | 'link';
		href?: string;
		text: string;
		variant?: 'filled' | 'outline' | 'link';
		icon?: string;
		target?: string;
		onclick?: () => void;
	} = $props();

	const variantClasses = {
		filled:
			'bg-blue-950 text-white hover:bg-blue-900 px-4 py-2 rounded-md',
		outline:
			'border-2 border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white px-4 py-2 rounded-md',
		link: 'text-[var(--color-charcoal)] hover:text-blue-950 no-underline'
	};
</script>

{#if type === 'link'}
	<a
		{href}
		{target}
		class="inline-flex items-center gap-2 font-sans text-sm transition-all duration-300 {variantClasses[
			variant
		]}"
		data-sveltekit-preload-data="hover"
	>
		{text}
		{#if icon}
			<iconify-icon {icon} class="text-base"></iconify-icon>
		{/if}
	</a>
{:else}
	<button
		{onclick}
		class="inline-flex items-center gap-2 font-sans text-sm transition-all duration-300 {variantClasses[
			variant
		]}"
	>
		{text}
		{#if icon}
			<iconify-icon {icon} class="text-base"></iconify-icon>
		{/if}
	</button>
{/if}

<style>
	a {
		text-decoration: none;
	}
</style>
