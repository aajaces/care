<script lang="ts">
	import { slide } from 'svelte/transition';

	let mobileMenuOpen = $state(false);
	let headerElement: HTMLElement | null = $state(null);

	$effect(() => {
		// Prevent body scroll when mobile menu is open
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		// Set header height CSS variable for mobile menu positioning
		if (headerElement) {
			const height = headerElement.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		}
	});
</script>

<header
	bind:this={headerElement}
	class="sticky top-0 z-20 flex w-full flex-col items-center justify-between backdrop-blur-md bg-[var(--color-parchment)]/95 transition-colors duration-300"
>
	<!-- Desktop Header -->
	<div
		class="header-content mx-auto hidden h-16 w-full items-center justify-between lg:flex px-8"
		style="max-width: 1440px;"
	>
		<div class="mx-auto grid h-16 w-full grid-cols-3 items-center" style="max-width: 1440px;">
			<!-- Left: Logo -->
			<div class="w-full">
				<a
					href="/"
					class="inline-flex items-center font-serif text-2xl text-blue-950 font-light"
				data-sveltekit-preload-data="hover"
				>
					CADRE
				</a>
			</div>

			<!-- Center: Navigation -->
			<nav class="flex justify-center">
				<div class="flex w-fit items-center space-x-6">
					<a
						href="#about"
						class="font-serif text-[var(--color-charcoal)] hover:text-blue-950 transition-colors no-underline font-light"
					>
						About
					</a>
					<a
						href="#leaderboard"
						class="font-serif text-[var(--color-charcoal)] hover:text-blue-950 transition-colors no-underline font-light"
					>
						Leaderboard
					</a>
					<a
						href="#methodology"
						class="font-serif text-[var(--color-charcoal)] hover:text-blue-950 transition-colors no-underline font-light"
					>
						Methodology
					</a>
				</div>
			</nav>

			<!-- Right: CTA buttons -->
			<div class="flex w-full justify-end space-x-2">
				<a
					href="https://github.com/ariata-os/care"
					target="_blank"
					class="inline-flex items-center gap-2 font-serif text-[var(--color-charcoal)] hover:text-blue-950 transition-colors no-underline font-light"
				>
					GitHub
					<iconify-icon icon="ri:github-fill" class="text-base"></iconify-icon>
				</a>
			</div>
		</div>
	</div>

	<!-- Mobile Header -->
	<div class="z-30 flex h-fit w-full items-center justify-between px-4 py-4 lg:hidden">
		<div class="flex w-full items-center justify-between">
			<a href="/" class="font-serif text-2xl whitespace-nowrap text-blue-950 font-light">
				CADRE
			</a>

			<!-- mobile menu toggle-->
			<div class="">
				<button
					id="mobileButton"
					aria-label="Mobile Button"
					aria-expanded={mobileMenuOpen ? 'true' : 'false'}
					class="mobilemenu"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class:open={mobileMenuOpen}
				>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
					<span aria-hidden="true" class="square"></span>
				</button>
			</div>
		</div>
	</div>
</header>

{#if mobileMenuOpen}
	<div
		transition:slide={{ duration: 500 }}
		class="fixed right-0 bottom-0 left-0 z-20 flex w-full bg-[var(--color-charcoal)] font-serif text-xl text-white"
		style="top: var(--header-height, 4rem);"
	>
		<div class="mx-auto mt-24 flex flex-col items-center justify-center space-y-8 pb-12 w-full">
			<a
				onclick={() => (mobileMenuOpen = false)}
				href="#about"
				class="text-[var(--color-cream)] hover:text-white transition-colors no-underline font-light">About</a
			>
			<a
				onclick={() => (mobileMenuOpen = false)}
				href="#leaderboard"
				class="text-[var(--color-cream)] hover:text-white transition-colors no-underline font-light"
				>Leaderboard</a
			>
			<a
				onclick={() => (mobileMenuOpen = false)}
				href="#methodology"
				class="text-[var(--color-cream)] hover:text-white transition-colors no-underline font-light"
				>Methodology</a
			>
			<a
				onclick={() => (mobileMenuOpen = false)}
				href="https://github.com/ariata-os/care"
				target="_blank"
				class="text-[var(--color-cream)] hover:text-white transition-colors no-underline font-light">GitHub</a
			>
		</div>
	</div>
{/if}

<style>
	.square {
		width: 5px;
		height: 5px;
		background-color: var(--color-navy);
		display: block;
		transform: scale(1.2);
		border-radius: 50%;
	}

	.mobilemenu {
		width: 30px;
		height: 30px;
		position: relative;
		transition: 0.1s;
		cursor: pointer;
		display: inline-block;
	}

	.mobilemenu span {
		width: 5px;
		height: 5px;
		background-color: var(--color-navy);
		display: block;
		position: absolute;
		border-radius: 50%;
	}

	.mobilemenu:hover span {
		transition: 350ms cubic-bezier(0.8, 0.5, 0.2, 1.4);
	}

	.mobilemenu span:nth-child(1) {
		left: 0;
		top: 0;
	}

	.mobilemenu span:nth-child(2) {
		left: 12px;
		top: 0;
	}

	.mobilemenu span:nth-child(3) {
		right: 0;
		top: 0;
	}

	.mobilemenu span:nth-child(4) {
		left: 0;
		top: 12px;
	}

	.mobilemenu span:nth-child(5) {
		position: absolute;
		left: 12px;
		top: 12px;
	}

	.mobilemenu span:nth-child(6) {
		right: 0px;
		top: 12px;
	}

	.mobilemenu span:nth-child(7) {
		left: 0px;
		bottom: 0px;
	}

	.mobilemenu span:nth-child(8) {
		position: absolute;
		left: 12px;
		bottom: 0px;
	}

	.mobilemenu span:nth-child(9) {
		right: 0px;
		bottom: 0px;
	}

	.mobilemenu.open {
		transform: rotate(180deg);
		cursor: pointer;
		transition: 0.2s cubic-bezier(0.8, 0.5, 0.2, 1.4);
	}

	.mobilemenu.open span {
		transition-delay: 200ms;
		transition: 0.5s cubic-bezier(0.8, 0.5, 0.2, 1.4);
	}

	.mobilemenu.open span:nth-child(2) {
		left: 6px;
		top: 6px;
	}

	.mobilemenu.open span:nth-child(4) {
		left: 6px;
		top: 18px;
	}

	.mobilemenu.open span:nth-child(6) {
		right: 6px;
		top: 6px;
	}

	.mobilemenu.open span:nth-child(8) {
		left: 18px;
		bottom: 6px;
	}

	.backdrop-blur-md {
		backdrop-filter: blur(16px);
	}

	a {
		text-decoration: none;
	}
</style>
