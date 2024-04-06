// import { IOption } from "./dropdown-types";


interface IOption {
    label: string;
    value: string;
    icon?: string;
}

const templateString = `
    <nav class="dropdown">
        <header class="dropdown-header">
            <p class="header-text"></p>
            <i class="fa fa-angle-down header-icon"></i>
        </header>

        <div class="dropdown-container">
            <input type="text" class="dropdown-search" />
            <ul class="dropdown-content">
            </ul>
        </div>
    </nav>
`;

const template = document.createElement("template");
template.innerHTML = templateString;

const linkElem = document.createElement('link');
linkElem.setAttribute('rel', 'stylesheet');
linkElem.setAttribute('type', 'text/css');
linkElem.setAttribute('href', './dropdown.css');

const cdnLinkElem = document.createElement("link");
cdnLinkElem.setAttribute('rel', 'stylesheet');
cdnLinkElem.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')

class Dropdown extends HTMLElement {
    private _dropdownContent: any = null;
    private _dropdownContainer: any = null;
    private _dropdownSearch: any = null;
    private _dropdownHeader: any = null;
    private _dropdown: any;
    private _isDropdownOpen = false;

    private _dropdownSearchValue = '';

    private _dropdownItemElements: any = [];
    private _dropdownItems: IOption[] = [];
    private _itemHeight: string = '20px';
    private _initialItemsNo: number = 3;
    private _noItemsDataText: string | null = '';

    private _itemsNo: number = 0;

    private _itemsIntersectionDetails:{[key: string]: {
        isIntersecting: boolean,
        intersectionRatio: number,
        scrollDirection: 'up' | 'down' | 'none',
        isScrolledForMoreData: boolean
    }} = {};
    private _itemIntersectionObservers:any = {};
    private _thresholds: number[] = [];

    private _useVirtualScroll: boolean = false;
    private _noOfVirtualScrollVisibleItems = 0;
    private _topIndex = 0;
    private _lastIndex = 0;
    
    private _useInfiniteScroll: boolean = true;
    private _itemsLimit = 20;
    private _infiniteScrollOffset = 80;
    private _infiniteScrollTriggerItem = 16;
    private _infiniteScrollFn:((page: number, limit: number, searchValue: string) => IOption[]) | null = null;
    private _page = 1;

    private _customStyles;

    // dropdown search
    private _timerId = undefined;

    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot?.appendChild(cdnLinkElem);
        this.shadowRoot?.appendChild(linkElem);
        this.shadowRoot?.appendChild(template.content.cloneNode(true));

        this._dropdown = this.shadowRoot?.querySelector('.dropdown');
        this._dropdownContent = this.shadowRoot?.querySelector(".dropdown-content");
        this._dropdownContainer = this.shadowRoot?.querySelector(".dropdown-container");
        this._dropdownSearch = this.shadowRoot?.querySelector(".dropdown-search");

        this._dropdownHeader = this.shadowRoot?.querySelector(".dropdown-header");
        this._dropdownHeader.addEventListener('click', () => this.onHeaderIconClick());

        this._customStyles = document.createElement('style');

        new IntersectionObserver((entries, observer) => this.handleDropdownHeaderIntersect(entries, observer), {
            root: this._dropdown,
            threshold: [0,1.0]
        }).observe(this._dropdownHeader);
    }

    dropdownConnected() {

        let itemHeight = this.getAttribute("item-height");
        this._itemHeight = itemHeight ? itemHeight : '20px';

        let initialItemsNo = this.getAttribute("initial-items-no");
        this._initialItemsNo = initialItemsNo ? parseInt(initialItemsNo) : 4;

        this._noItemsDataText = this.getAttribute("no-data-text");

        let useVirtualScroll = this.getAttribute("use-virtual-scroll");
        this._useVirtualScroll = useVirtualScroll == 'true' ? true : false;
        if(this._useVirtualScroll) {
            this._noOfVirtualScrollVisibleItems = Math.ceil(230 / (parseInt(this._itemHeight, 10) + 20));
            this._lastIndex = this._noOfVirtualScrollVisibleItems - 2;
        }

        let useInfiniteScroll = this.getAttribute("use-infinite-scroll");
        this._useInfiniteScroll = useInfiniteScroll == 'true' ? true : false;
        if(this._useInfiniteScroll) {
            let itemsLimit = this.getAttribute("items-limit");
            this._itemsLimit = itemsLimit ? parseInt(itemsLimit) : 20;
            this._infiniteScrollTriggerItem = Math.floor((this._infiniteScrollOffset / 100) * this._itemsLimit);
        }
    }

    static get observedAttributes() { 
        return ['item-height', 'initial-items-no', 'no-data-text', 'use-infinite-scroll']; 
    }

    attributeChangedCallback(attribute: string, oldVal: string, newVal: string) {
        
    }

    createNoDataListItemElement() {
        const listItem = document.createElement('li');
        listItem.innerHTML = this._noItemsDataText ? this._noItemsDataText : '';
        listItem.classList.add('dropdown-item');
        return listItem;
    }

    attachNoDataListItem() {
        const noDataListItem = this.createNoDataListItemElement();
        this._dropdownContent.innerHTML = '';

        this._dropdownContent.appendChild(noDataListItem);
        this._dropdownItemElements = [noDataListItem];
        this._itemsIntersectionDetails['0'] = {
            isIntersecting: false,
            intersectionRatio: 0,
            scrollDirection: 'none',
            isScrolledForMoreData: false
        }
    }

    setOptions(options: IOption[]) {
        this.dropdownConnected();
        this._dropdownItems = options;
        this._itemsNo = options.length;

        this._thresholds = this.buildDropdownItemThresholds();

        if(this._dropdownItems.length) {
            this.createDropdownItemElements(options);
            this.setDisplayItems(options, true);
            this.createIntersectionObserversForItems(this._thresholds);
        } else {
            this.attachNoDataListItem();
            this.toggleDropDownContentDisplay();
            this.changeDropdownHeaderText({
                value: 'no-data-text',
                label: this._noItemsDataText ? this._noItemsDataText : '',
                icon: undefined
            });
            new IntersectionObserver((entries, observer) =>  this.handleDropdownItemIntersect(entries, observer, '0'), {
                root: this._dropdownContent,
                threshold: this._thresholds
            }).observe(this._dropdownItemElements[0]);
        }
    }

    createItemClickFn(index: number, clickFn: (option: IOption) => void) {
        return () => {
            clickFn(this._dropdownItems[index]);
            this.changeDropdownHeaderText(this._dropdownItems[index]);
            this.toggleDropDownContentDisplay();
        } 
    }

    setItemClick(clickFn: (option: IOption) => void) {
        let index = 0;
        for(let item of this._dropdownItemElements) {
            item.addEventListener('click', this.createItemClickFn(index, clickFn));

            index++;
        }
    }

    createDropdownItemElements(options: IOption[]) {
        this._dropdownItemElements = [];
        this._dropdownContent.innerHTML = '';

        for(let item of options) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${item.value} : ${item.label}`;
            listItem.id = item.value;
            listItem.classList.add('dropdown-item');

            this._dropdownItemElements.push(listItem);
            if(this._useInfiniteScroll) {
                this._dropdownContent.appendChild(listItem);
            }
        }
    }

    setDisplayItems(options: IOption[], shouldToggle: boolean = false) {
        if(shouldToggle)
            this.toggleDropDownContentDisplay();
        
        this.changeDropdownHeaderText(options[0]);
        if(this._useVirtualScroll) {
            this.replaceItemsOfContent(this._topIndex, this._lastIndex + 2);
        }

        this.setDropdownContentScroll();
        this.setDropdownSearchChange();
    }

    replaceItemsOfContent(start: number, end: number) {
        const elements = this._dropdownItemElements.slice(start, end + 1);
        this._dropdownContent.innerHTML = '';

        for(let element of elements) {
            this._dropdownContent.appendChild(element);
        }
    }

    appendItemsToContent(options: IOption[]) {
        if(options.length) {
            this._dropdownItems = [...this._dropdownItems, ...options];
            
            for(let item of options) {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${item.value} : ${item.label}`;
                listItem.id = item.value;
                listItem.classList.add('dropdown-item');
                
                this._dropdownContent.appendChild(listItem);
                this._dropdownItemElements.push(listItem);
            }

            this.createIntersectionObserversForItems(this._thresholds);

            this._page += 1;
            this._itemsNo = this._dropdownItems.length;
            this._itemsIntersectionDetails[this._infiniteScrollTriggerItem].isScrolledForMoreData = true;
            let nextInfiniteScrollTriggerItem = Math.floor((this._infiniteScrollOffset / 100) * this._itemsNo)
            this._infiniteScrollTriggerItem = Math.min(this._dropdownItems.length - 1, nextInfiniteScrollTriggerItem);
        }
    }

    // Get top index visibility and update top index along with last index.
    setVirtualScrolling() {
        if(this._isDropdownOpen) {
           const topIndex = this._topIndex.toString(),
               prevIndex = this._topIndex >= 1 ? (this._topIndex - 1).toString() : '0',
               topItemDetails = this._itemsIntersectionDetails[topIndex],
               prevItemDetails = this._itemsIntersectionDetails[prevIndex];

           let newTopIndex = this._topIndex,
               newLastIndex = this._lastIndex;

           if(topItemDetails.intersectionRatio < 0.05) {
               newTopIndex += 1;
               newLastIndex += 1;
           } else if(newTopIndex >= 1 && prevItemDetails.intersectionRatio == 1) {
               newTopIndex -= 1;
               newLastIndex -= 1;
           }
           
            this._topIndex = newTopIndex;
            this._lastIndex = newLastIndex;

            if(this._dropdownItems.length - this._lastIndex > 2) {
                const lastIndex = this._lastIndex + 2;

                if(this._topIndex == 1 || this._topIndex == 0) {
                    this.replaceItemsOfContent(0, lastIndex);
                } else {
                    this.replaceItemsOfContent(this._topIndex - 2, lastIndex);
                }
            }
       }
    }

    onSearchChange = (value: string) => {
        this._dropdownSearchValue = value;

        let filteredItems = this._dropdownItems;
        if(value) {
            if(this._useVirtualScroll) {
                const regEx = new RegExp(value, 'i');
                filteredItems = this._dropdownItems.filter(item => regEx.test(item.label));
            } else if(this._useInfiniteScroll && this._infiniteScrollFn) {
                filteredItems = this._infiniteScrollFn(0, this._itemsLimit, this._dropdownSearchValue);
            }
        }

        if(!filteredItems.length) {
            this.attachNoDataListItem();
            this.removeItemIntersectionObservers();
            this.createIntersectionObserversForItems(this._thresholds);   
            return;
        }

        if(this._useVirtualScroll) {
            this._topIndex = 0;
            this._lastIndex = Math.min(this._topIndex + this._noOfVirtualScrollVisibleItems + 2, this._dropdownItems.length - 1);
            this.createDropdownItemElements(filteredItems);
            this.replaceItemsOfContent(this._topIndex, this._lastIndex);
            this.removeItemIntersectionObservers();
            this.createIntersectionObserversForItems(this._thresholds);
        } else if(this._useInfiniteScroll) {
            this._dropdownItems = [];
            this._dropdownItemElements = [];
            this._dropdownContent.innerHTML = '';
            this._infiniteScrollTriggerItem = 0;
            this._page = 0;
            this._dropdownContent.scrollTop = 0;
            this.removeItemIntersectionObservers();
            this.appendItemsToContent(filteredItems);
            this._infiniteScrollTriggerItem = Math.floor((this._infiniteScrollOffset / 100) * this._itemsNo);
        }
    }

    setDropdownSearchChange() {
        this._dropdownSearch.addEventListener('input', (event: any) => {
            this._timerId = this.debounceFunction(this.onSearchChange, 200, this._timerId, event.target.value);
        })
    }

    setInfiniteScrollFn(scrollFn: (page: number, limit: number, searchValue: string) => IOption[]) {
        this._infiniteScrollFn = scrollFn;
    }

    setDropdownContentScroll() {
        this._dropdownContent.addEventListener('scroll',() => {
            if(this._useVirtualScroll) {
                this.setVirtualScrolling();
            } else if(this._useInfiniteScroll && this._infiniteScrollFn) {
                if(this._itemsIntersectionDetails[this._infiniteScrollTriggerItem]?.scrollDirection == 'up' && 
                    !this._itemsIntersectionDetails[this._infiniteScrollTriggerItem]?.isScrolledForMoreData) {
                    const options = this._infiniteScrollFn(this._page, this._itemsLimit, this._dropdownSearchValue);
                    this.appendItemsToContent(options);
                }
            }
        });
    }

    changeDropdownHeaderText(option: IOption) {
        const item = this._dropdownHeader.firstElementChild;

        if(item) {
            item.innerHTML = option.label;
            item.id = option.value;
        }
    }

    removeItemIntersectionObservers() {
        for(let index in this._itemIntersectionObservers) {
            this._itemIntersectionObservers[index].disconnect();
        }

        this._itemsIntersectionDetails = {};
    }

    createIntersectionObserversForItems(thresholds: number[]) {
        for(let index in this._dropdownItemElements) {
            const item = this._dropdownItemElements[index];
            if(item && typeof item == 'object') {
                if(!this._itemsIntersectionDetails[index]) {
                    this._itemsIntersectionDetails[index] = {
                        isIntersecting: false,
                        intersectionRatio: 0,
                        scrollDirection: 'none',
                        isScrolledForMoreData: false
                    }
    
                    this._itemIntersectionObservers[index] = new IntersectionObserver((entries, observer) =>  
                        this.handleDropdownItemIntersect(entries, observer, index), {
                            root: this._dropdownContent,
                            threshold: thresholds
                        });

                    this._itemIntersectionObservers[index].observe(item);
                }
            }
        }
    }

    buildDropdownItemThresholds() {
        let thresholds = [0.05];

        for(let i=1;i < this._initialItemsNo;i++) {
            const ratio = (i/this._initialItemsNo);
            thresholds.push(ratio);
        }

        thresholds.push(1);
        return thresholds;
    }

    onHeaderIconClick() {
        this.toggleDropDownContentDisplay();
    }

    handleDropdownHeaderIntersect(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
        for(let entry of entries) {
            if(entry.intersectionRatio == 1) {
                const resizer = new ResizeObserver((entries: ResizeObserverEntry[]) => this.onDropDownContentResize(entries));
                resizer.observe(this._dropdownContent);
            }
        }
    }

    handleDropdownItemIntersect(entries: IntersectionObserverEntry[], observer: IntersectionObserver, index: string) {
        for(let entry of entries) {
            if(entry.isIntersecting) {
                this._dropdownItemElements[index].style.height = this._itemHeight;
                this._dropdownItemElements[index].style.opacity = entry.intersectionRatio;
            } else {
                this._dropdownItemElements[index].style.height = 0;
                this._dropdownItemElements[index].style.opacity = entry.intersectionRatio;
            }

            const prevItemIntersectionRatio = this._itemsIntersectionDetails[index].intersectionRatio;
            this._itemsIntersectionDetails[index].isIntersecting = entry.isIntersecting;
            this._itemsIntersectionDetails[index].intersectionRatio = entry.intersectionRatio;

            if(prevItemIntersectionRatio < entry.intersectionRatio) {
                this._itemsIntersectionDetails[index].scrollDirection = 'up';
            } else if(prevItemIntersectionRatio > entry.intersectionRatio) {
                this._itemsIntersectionDetails[index].scrollDirection = 'down';
            }

            this.setDropdownItemBorders(entry.isIntersecting, index);
        }
    }

    setDropdownItemBorders(isIntersecting: boolean, index: string) {
        const ind = parseInt(index, 10);

        if(isIntersecting) {
            if(ind == 0) {
                this._dropdownItemElements[index].style.borderTop = 0;
                this._dropdownItemElements[index].style.borderBottom = '1px solid grey';
            } else if(ind == this._itemsNo - 1) {
                this._dropdownItemElements[index].style.borderTop = '1px solid grey';
                this._dropdownItemElements[index].style.borderBottom = 0;
            } else {
                this._dropdownItemElements[index].style.borderBottom = '1px solid grey';
                this._dropdownItemElements[index].style.borderTop = '1px solid grey';
            }
        } else {
            this._dropdownItemElements[index].style.borderBottom = 0;
            this._dropdownItemElements[index].style.borderTop = 0;

            if(this.checkAllDropdownItemsClosed()) {
                setTimeout(() => this._dropdownContent.style.border = 0, 700);
                this._dropdownHeader.classList.remove('dropdown-content-opened-header');
            }
        }
    }

    checkAllDropdownItemsClosed() {
        const contentHeight = parseInt(this._dropdownContent.style.height);
        return contentHeight == 0;
    }

    onDropDownContentResize(entries: ResizeObserverEntry[]) {
        if(entries[0].contentRect.height) {
            this._dropdownHeader.classList.add('dropdown-content-opened-header');
        } else {
            this._dropdownHeader.classList.remove('dropdown-content-opened-header');
        }
    }

    toggleDropDownContentDisplay() {
        const dropdownContentHeight = parseInt(this._dropdownContent.style.height, 10);

        if(dropdownContentHeight || isNaN(dropdownContentHeight)) {
            this._dropdown.style.height = '50px';
            this._dropdownContainer.style.height = 0;
            setTimeout(() => this._dropdownSearch.style.visibility = 'hidden', 700);
            this._dropdownContent.style.height = 0;
            this._isDropdownOpen = false;
            this._dropdownContent.scrollTop  = 0;
        } else {
            this._dropdown.style.height = '300px';
            this._dropdownContainer.style.height = '200px';
            this._dropdownSearch.style.visibility = 'visible';
            this._dropdownContent.style.height = '200px';
            this._dropdownContent.style.border = '1px solid black';
            this._isDropdownOpen = true;
        }
    }

    debounceFunction(func: any, delay: number, timerId: any = undefined, ...args: any) {
        // Cancels the setTimeout method execution
        clearTimeout(timerId);

        // Executes the func after delay time.
        timerId  =  setTimeout(func(...args), delay);
        return timerId;
    }
}

customElements.define('drop-down', Dropdown);

