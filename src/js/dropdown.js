document.querySelectorAll('.but').forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const currentDrop = this.closest('.drop');
        if (!currentDrop) return;

        const isAlreadyOpen = currentDrop.classList.contains('dnopen');

        // Close all dropdowns
        document.querySelectorAll('.drop.dnopen').forEach(drop => {
            drop.classList.remove('dnopen');
        });

        // Open only if it was previously closed
        if (!isAlreadyOpen) {
            currentDrop.classList.add('dnopen');
        }
    });
});
