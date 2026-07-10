import type { MediaItem } from "../webgl";

type UIHandlers = {
	onPrev: () => void;
	onNext: () => void;
	onClose: () => void;
};

let container: HTMLDivElement | null = null;
let titleEl: HTMLElement | null = null;
let creditEl: HTMLAnchorElement | null = null;

export const setupZoomUI = (handlers: UIHandlers): void => {
	container = document.createElement("div");
	container.id = "zoom-ui";
	container.innerHTML = `
		<button class="zoom-ui-back" type="button">Back</button>
		<div class="zoom-ui-info">
			<h2 class="zoom-ui-title"></h2>
			<a class="zoom-ui-credit" target="_blank" rel="noopener noreferrer"></a>
		</div>
		<div class="zoom-ui-nav">
			<button class="zoom-ui-prev" type="button">Prev</button>
			<button class="zoom-ui-next" type="button">Next</button>
		</div>
	`;
	document.body.appendChild(container);

	titleEl = container.querySelector<HTMLElement>(".zoom-ui-title");
	creditEl = container.querySelector<HTMLAnchorElement>(".zoom-ui-credit");

	container
		.querySelector<HTMLButtonElement>(".zoom-ui-back")
		?.addEventListener("click", handlers.onClose);
	container
		.querySelector<HTMLButtonElement>(".zoom-ui-prev")
		?.addEventListener("click", handlers.onPrev);
	container
		.querySelector<HTMLButtonElement>(".zoom-ui-next")
		?.addEventListener("click", handlers.onNext);
};

export const showZoomUI = (item: MediaItem): void => {
	if (!container || !titleEl || !creditEl) return;
	titleEl.textContent = item.title;
	creditEl.textContent = item.source.label;
	creditEl.href = item.source.url;
	container.classList.add("visible");
};

export const hideZoomUI = (): void => {
	if (!container) return;
	container.classList.remove("visible");
};
