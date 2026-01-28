(function() {
    function format2(num) {
        if (isNaN(num)) return "0.00";
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function calculate() {
        const qtyEl = document.getElementById("qty");
        const bonusEl = document.getElementById("bonus");
        const cashEl = document.getElementById("cash");
        const paidupEl = document.getElementById("paidup");
        if (!qtyEl || !bonusEl || !cashEl || !paidupEl) return;

        const quantity = Number(qtyEl.value) || 0;
        const bonuspercent = Number(bonusEl.value) || 0;
        const cashpercent = Number(cashEl.value) || 0;
        const paidUpcapital = Number(paidupEl.value) || 0;

        const results = {
            total: document.getElementById("total"),
            bsharetax: document.getElementById("bsharetax"),
            catax: document.getElementById("catax"),
            totaltax: document.getElementById("totaltax"),
            rbqty: document.getElementById("rbqty")
        };

        if (quantity <= 0 || paidUpcapital <= 0) {
            Object.values(results).forEach(el => el && (el.textContent = '-'));
            return;
        }

        const totalBonusShares = (quantity * bonuspercent) / 100;
        const totalCashDividend = (quantity * paidUpcapital * cashpercent) / 100;
        const bonusShareTax = (totalBonusShares * paidUpcapital * 5) / 100;
        const cashDividendTax = (totalCashDividend * 5) / 100;
        const totalTaxPayable = bonusShareTax + cashDividendTax;

        results.total.textContent = format2(totalCashDividend);
        results.bsharetax.textContent = format2(bonusShareTax);
        results.catax.textContent = format2(cashDividendTax);
        results.totaltax.textContent = format2(totalTaxPayable);
        results.rbqty.textContent = format2(totalBonusShares);
    }

    function clear() {
        ['qty', 'bonus', 'cash'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['total', 'bsharetax', 'catax', 'totaltax', 'rbqty'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    function init() {
        const clearBtn = document.getElementById('clear');

        if (clearBtn) clearBtn.addEventListener('click', clear);

        ['qty', 'bonus', 'cash', 'paidup'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', calculate);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
