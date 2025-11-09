<script lang="ts">
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import {
		getProviderColor,
		type ModelDataPoint,
	} from "$lib/data/model-data";

	// Accept data as prop from parent page
	let { modelData = [] }: { modelData: ModelDataPoint[] } = $props();

	let svgElement: SVGSVGElement;
	let containerWidth = 978;
	let containerHeight = 500;

	// Chart dimensions
	const margin = { top: 20, right: 120, bottom: 60, left: 60 };
	const width = containerWidth - margin.left - margin.right;
	const height = containerHeight - margin.top - margin.bottom;

	onMount(() => {
		createChart();

		// Responsive resize
		const resizeObserver = new ResizeObserver(() => {
			createChart();
		});

		if (svgElement.parentElement) {
			resizeObserver.observe(svgElement.parentElement);
		}

		return () => resizeObserver.disconnect();
	});

	function createChart() {
		// Clear existing content
		d3.select(svgElement).selectAll("*").remove();

		// Create SVG
		const svg = d3
			.select(svgElement)
			.attr("width", containerWidth)
			.attr("height", containerHeight);

		const g = svg
			.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		// Create scales
		const xScale = d3
			.scaleLog()
			.domain([0.05, 100])
			.range([0, width])
			.nice();

		const yScale = d3.scaleLinear().domain([50, 100]).range([height, 0]);

		// Add background
		g.append("rect")
			.attr("class", "chart-background")
			.attr("fill", "#f5f1e8")
			.attr("width", width)
			.attr("height", height);

		// Create grid group
		const gridGroup = g.append("g").attr("class", "grid-group");

		// Add grid lines
		const xGrid = gridGroup
			.append("g")
			.attr("class", "grid x-grid")
			.attr("transform", `translate(0,${height})`);

		xGrid
			.selectAll("line")
			.data(xScale.ticks())
			.enter()
			.append("line")
			.attr("x1", (d) => xScale(d))
			.attr("x2", (d) => xScale(d))
			.attr("y1", 0)
			.attr("y2", -height)
			.attr("stroke", "#ccc")
			.attr("stroke-opacity", 0.7);

		const yGrid = gridGroup.append("g").attr("class", "grid y-grid");

		yGrid
			.selectAll("line")
			.data(yScale.ticks(10))
			.enter()
			.append("line")
			.attr("x1", 0)
			.attr("x2", width)
			.attr("y1", (d) => yScale(d))
			.attr("y2", (d) => yScale(d))
			.attr("stroke", "#ccc")
			.attr("stroke-opacity", 0.7);

		// Add axes
		const xAxis = d3
			.axisBottom(xScale)
			.tickValues([0.1, 0.5, 1, 5, 10, 50, 100])
			.tickFormat((d) => {
				const val = d as number;
				if (val < 1) return `$${val.toFixed(1)}`;
				return `$${val}`;
			});

		const yAxis = d3
			.axisLeft(yScale)
			.ticks(10)
			.tickFormat((d) => `${d}%`);

		g.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", `translate(0,${height})`)
			.call(xAxis)
			.selectAll("text")
			.attr("fill", "#000")
			.style("font-family", "Lora, serif")
			.style("font-size", "12px");

		g.append("g")
			.attr("class", "y-axis axis")
			.call(yAxis)
			.selectAll("text")
			.attr("fill", "#000")
			.style("font-family", "Lora, serif")
			.style("font-size", "12px");

		// Style axis paths
		g.selectAll(".axis path").attr("stroke", "#000");
		g.selectAll(".axis line").attr("stroke", "#000");

		// Add axis labels
		g.append("text")
			.attr("class", "axis-label")
			.attr("x", width / 2)
			.attr("y", height + 45)
			.attr("text-anchor", "middle")
			.attr("fill", "#000")
			.style("font-family", "Lora, serif")
			.style("font-size", "14px")
			.style("font-style", "italic")
			.text("Cost per 1M tokens (USD)");

		g.append("text")
			.attr("class", "axis-label")
			.attr("transform", "rotate(-90)")
			.attr("x", -height / 2)
			.attr("y", -45)
			.attr("text-anchor", "middle")
			.attr("fill", "#000")
			.style("font-family", "Lora, serif")
			.style("font-size", "14px")
			.style("font-style", "italic")
			.text("CADRE Benchmark Score (%)");

		// Group data by model family for lines
		const families = d3.group(modelData, (d) => d.modelFamily || d.id);

		// Add lines connecting model families
		const lineGroup = g.append("g").attr("class", "model-lines-group");

		families.forEach((familyData) => {
			if (familyData.length > 1) {
				// Sort by cost
				const sortedData = [...familyData].sort(
					(a, b) => a.cost - b.cost,
				);

				const line = d3
					.line<ModelDataPoint>()
					.x((d) => xScale(d.cost))
					.y((d) => yScale(d.performance))
					.curve(d3.curveMonotoneX);

				lineGroup
					.append("path")
					.datum(sortedData)
					.attr("class", "model-group-line")
					.attr("d", line)
					.attr("fill", "none")
					.attr("stroke", getProviderColor(sortedData[0].provider))
					.attr("stroke-width", 1.5)
					.attr("stroke-dasharray", "5,3")
					.attr("opacity", 0.5);
			}
		});

		// Add crosshair lines (initially hidden)
		const crosshairGroup = g.append("g").attr("class", "crosshair-group");

		const crosshairX = crosshairGroup
			.append("line")
			.attr("class", "crosshair-x")
			.attr("y1", 0)
			.attr("y2", height)
			.attr("stroke", "#000")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", "5,5")
			.attr("opacity", 0)
			.style("pointer-events", "none");

		const crosshairY = crosshairGroup
			.append("line")
			.attr("class", "crosshair-y")
			.attr("x1", 0)
			.attr("x2", width)
			.attr("stroke", "#000")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", "5,5")
			.attr("opacity", 0)
			.style("pointer-events", "none");

		// Add invisible overlay for mouse tracking
		const overlay = g
			.append("rect")
			.attr("class", "overlay")
			.attr("width", width)
			.attr("height", height)
			.attr("fill", "none")
			.style("pointer-events", "all")
			.style("cursor", "crosshair");

		// Add points
		const pointsGroup = g.append("g").attr("class", "points-group");

		const tooltip = d3
			.select("body")
			.append("div")
			.attr("class", "chart-tooltip")
			.style("position", "absolute")
			.style("visibility", "hidden")
			.style("background-color", "rgba(45, 45, 45, 0.95)")
			.style("color", "#fff")
			.style("padding", "12px")
			.style("border-radius", "6px")
			.style("font-family", "Lora, serif")
			.style("font-size", "13px")
			.style("pointer-events", "none")
			.style("z-index", "1000")
			.style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");

		pointsGroup
			.selectAll("circle")
			.data(modelData)
			.enter()
			.append("circle")
			.attr("class", "point")
			.attr("cx", (d) => xScale(d.cost))
			.attr("cy", (d) => yScale(d.performance))
			.attr("r", 5)
			.attr("fill", (d) => getProviderColor(d.provider))
			.attr("stroke", "none")
			.attr("opacity", 0.9)
			.style("cursor", "pointer")
			.on("mouseover", function (event, d) {
				d3.select(this).attr("r", 7).attr("opacity", 1);
				tooltip
					.style("visibility", "visible")
					.html(
						`<strong>${d.name} ${d.version}</strong><br/>` +
							`Provider: ${d.provider}<br/>` +
							`Score: ${d.performance.toFixed(1)}%<br/>` +
							`Cost: $${d.cost.toFixed(2)}/1M tokens`,
					);
			})
			.on("mousemove", function (event) {
				tooltip
					.style("top", event.pageY - 10 + "px")
					.style("left", event.pageX + 10 + "px");
			})
			.on("mouseout", function () {
				d3.select(this).attr("r", 5).attr("opacity", 0.9);
				tooltip.style("visibility", "hidden");
			});

		// Mouse events for crosshair on overlay
		overlay
			.on("mousemove", function (event) {
				const [mouseX, mouseY] = d3.pointer(event);

				// Show crosshair
				crosshairX.attr("x1", mouseX).attr("x2", mouseX).attr("opacity", 0.5);

				crosshairY.attr("y1", mouseY).attr("y2", mouseY).attr("opacity", 0.5);
			})
			.on("mouseenter", function () {
				crosshairX.attr("opacity", 0.5);
				crosshairY.attr("opacity", 0.5);
			})
			.on("mouseleave", function () {
				crosshairX.attr("opacity", 0);
				crosshairY.attr("opacity", 0);
			});

		// Add legend
		const legend = g
			.append("g")
			.attr("class", "legend")
			.attr("transform", `translate(${width + 10}, 20)`);

		const providers = Array.from(
			new Set(modelData.map((d) => d.provider)),
		);

		legend
			.selectAll(".legend-item")
			.data(providers)
			.enter()
			.append("g")
			.attr("class", "legend-item")
			.attr("transform", (d, i) => `translate(0, ${i * 25})`)
			.each(function (d) {
				const item = d3.select(this);

				item.append("circle")
					.attr("r", 5)
					.attr("fill", getProviderColor(d))
					.attr("cx", 0)
					.attr("cy", 0);

				item.append("text")
					.attr("x", 12)
					.attr("y", 4)
					.attr("fill", "#000")
					.style("font-family", "Lora, serif")
					.style("font-size", "12px")
					.style("text-transform", "capitalize")
					.text(d);
			});

		// Add annotation for high performers (top right quadrant: <$1 cost, >85% score)
		const annotationGroup = g
			.append("g")
			.attr("class", "annotations-group");

		// Calculate the width from x=0 to x=$1 on the log scale
		const dollarOneX = xScale(1);

		annotationGroup
			.append("rect")
			.attr("class", "annotation-rect")
			.attr("x", 0)
			.attr("y", yScale(100))
			.attr("width", dollarOneX)
			.attr("height", yScale(85) - yScale(100))
			.attr("fill", "rgba(116, 27, 27, 0.1)")
			.attr("stroke", "#741b1b")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", "5,3")
			.attr("opacity", 0.6)
			.style("pointer-events", "none");

		annotationGroup
			.append("text")
			.attr("class", "annotation-text")
			.attr("x", 10)
			.attr("y", yScale(98))
			.attr("fill", "#999")
			.style("font-family", "Lora, serif")
			.style("font-size", "10px")
			.style("font-style", "italic")
			.style("letter-spacing", "0.1em")
			.style("pointer-events", "none")
			.text("HIGH PERFORMANCE TIER");

	}
</script>

<div class="chart-container">
	<svg bind:this={svgElement}></svg>
</div>

<style>
	.chart-container {
		width: 100%;
		display: flex;
		justify-content: center;
		background-color: #f5f1e8;
		border-radius: 8px;
	}

	:global(.chart-tooltip) {
		font-family: "Lora", serif !important;
	}

	:global(.axis path),
	:global(.axis line) {
		shape-rendering: crispEdges;
	}

	:global(.point) {
		transition:
			r 0.2s ease,
			opacity 0.2s ease;
	}
</style>
