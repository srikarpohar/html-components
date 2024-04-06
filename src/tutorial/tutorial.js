class SampleElement extends HTMLElement {

    constructor() {
        super();
        const template = document.querySelector("#sample");
        
        // const template1 = document.createElement("template");
        // template1.innerHTML = `
        // <style>
        //     div {
        //       margin-top: 20px;
        //       color: green;
        //     }
        //   </style>
        //   <div>
        //     <p>The Google search result of your name is <a target="_blank" rel="noopener">here</a></p>
        //   </div>`;
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(template.cloneNode(true));

        const anchorTag = this.shadowRoot.querySelector('a');
        if(anchorTag) {
            anchorTag.href = '';
        }
        // if(template) {
        //     this.shadowRoot.appendChild(template.cloneNode(true));
            
        // }
        
        // this.innerHTML = `<h1>Sample component using custom elements method</h1><p>${this.getAttribute("name") || 'Nobody'}</p>`;
    }

    static get observedAttributes() {
        return ['name'];
    }
    
      attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'name') {
            const anchorTag = this.shadowRoot?.querySelector('a');
            if(anchorTag) {
                anchorTag.href = `https://www.google.com/search?q=${newValue}`;
            }
        }
      }

    // connectedCallBack() {
    //     this.innerHTML = `<h1>Sample component using custom elements method</h1><p>${this.getAttribute("name") || 'Nobody'}</p>`;
    // }
}

customElements.define('sample-element', SampleElement);