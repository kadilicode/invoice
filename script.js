function billingSystem() {
    return {
        isLoggedIn: false,
        view: 'create',
        mobileMenu: false,
        loginEmail: '',
        loginPass: '',
        history: [],
        doc: {
            type: 'TAX INVOICE',
            customer: '',
            title: '',
            number: 'SAM-' + Math.floor(100 + Math.random() * 900),
            date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
            items: [{ qty: '1', desc: '', price: 0 }]
        },

        init() {
            const saved = localStorage.getItem('samos_kadili_db');
            if (saved) this.history = JSON.parse(saved);
        },

        login() {
            if (this.loginEmail === 'admin@gmail.com' && this.loginPass === 'Massam@123') {
                this.isLoggedIn = true;
            } else {
                alert("Credentials Error!");
            }
        },

        logout() { this.isLoggedIn = false; },
        addItem() { this.doc.items.push({ qty: '1', desc: '', price: 0 }); },
        removeItem(i) { this.doc.items.splice(i, 1); },
        calcTotal() {
            return this.doc.items.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * (item.price || 0)), 0);
        },
        formatMoney(n) { return new Intl.NumberFormat().format(n); },

        saveAndPrint() {
            if(!this.doc.customer) return alert("Weka Jina la Mteja!");
            const data = JSON.parse(JSON.stringify(this.doc));
            data.id = Date.now();
            data.total = this.calcTotal();
            this.history.unshift(data);
            localStorage.setItem('samos_kadili_db', JSON.stringify(this.history));
            setTimeout(() => { window.print(); }, 500);
        },

        printSaved(rec) {
            this.doc = JSON.parse(JSON.stringify(rec));
            setTimeout(() => { window.print(); }, 500);
        },

        deleteDoc(id) {
            if(confirm('Futa?')) {
                this.history = this.history.filter(h => h.id !== id);
                localStorage.setItem('samos_kadili_db', JSON.stringify(this.history));
            }
        }
    }
                                          }
                
