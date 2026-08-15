import "./styles/style.scss";

init();

/** Initializes the interactions on the memory field. */
function init(): void {
    const fieldRef: HTMLElement | null = document.getElementById("field");
    if (!fieldRef) {
        return;
    }
    fieldRef.addEventListener("click", handleFieldClick);
}

/** Toggles the flipped state of the selected memory card. */
function handleFieldClick(event: MouseEvent): void {
    const target: EventTarget | null = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const card: Element | null = target.closest(".card");
    if (!(card instanceof HTMLButtonElement)) {
        return;
    }
    const isFlipped: boolean = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(isFlipped));
}
