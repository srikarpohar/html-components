const elements = ['Virat Kohli', 'MSD', 'Rohit Sharma', 'Rishabh Pant', 'Shreyas Iyer', 'Ravi Ashwin'],
    options: IOption[] = [];

for(let i=0;i < 15000;i++) {
    options.push({
        label: elements[i%6],
        value: (i+1).toString(),
        icon: undefined
    })
}


// const virtualScrollDropdown = document.createElement('drop-down') as any;
// virtualScrollDropdown.setAttribute('item-height', '30px');
// virtualScrollDropdown.setAttribute('initial-items-no', '10');
// virtualScrollDropdown.setAttribute('no-data-text', "No data available");
// virtualScrollDropdown.setAttribute('use-virtual-scroll', 'true');

// virtualScrollDropdown.setOptions(options);
// virtualScrollDropdown.setItemClick((option: IOption) => console.log(option));
// document.querySelector(".virtual-scroll-dropdown")?.appendChild(virtualScrollDropdown);


const infiniteScrollDropdown = document.createElement('drop-down') as any;
infiniteScrollDropdown.setAttribute('no-data-text', "No data available");
infiniteScrollDropdown.setAttribute('use-infinite-scroll', 'true');
infiniteScrollDropdown.setAttribute('items-limit', '40');

infiniteScrollDropdown.setOptions(options.slice(0, 40));
infiniteScrollDropdown.setItemClick((option: IOption) => console.log(option));
infiniteScrollDropdown.setInfiniteScrollFn((page: number, limit: number, searchValue: string) => {
    const start = page * limit,
        end = Math.min(limit + page * limit, options.length);

    let finalOptions = options;
    if(searchValue) {
        const regEx = new RegExp(searchValue, 'i');
        finalOptions = options.filter(doc => regEx.test(doc.label));
    }
    return finalOptions.slice(start, end);
});
document.querySelector(".infinite-scroll-dropdown")?.appendChild(infiniteScrollDropdown);
