
const simpleDropDown = document.querySelector('#simple-dropdown');
console.log(simpleDropDown);

const readFileBtn = document.getElementById('read-file');
const stopReadFileBtn = document.getElementById('stop-file-read');
const readFileContent = document.getElementById('file-content');
const loader = document.getElementById('loader');
let fileContent = '', timerId = null, stopReading = false;

function throttle(func, limit = 1000) {
    let isInThrottle = false;
    return function(...args) {
        if(!isInThrottle) {
            func.apply(this, args);
            isInThrottle = true;
            setTimeout(() => {
                isInThrottle = false;
            }, limit);
        }
    }
}

function checkAndRemoveLoader() {
    console.log(`Stop reading: ${stopReading}`);
    return stopReading;
}

function readFile() {
    if(!readFileContent) {
        return;
    }
    stopReading = false;
    readFileContent.innerText = "";
    timerId = setInterval(() => {
        let i=0;
        fileContent = '\nLorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus, voluptate.';
        loader?.classList.toggle("hide-loader");
        console.log(`Toggled at ${i++}`);

        setTimeout((i, checkAndRemoveLoader) => {
            console.log(`Read at ${i}`);
            readFileContent?.append(fileContent);
            if(checkAndRemoveLoader()) {
                loader?.classList.add("hide-loader");
            } else {
                loader?.classList.toggle("hide-loader");
            }
        }, 500, i, checkAndRemoveLoader);
    }, 1000);
}

readFileBtn?.addEventListener('click', () => {
    readFile();
});

stopReadFileBtn?.addEventListener("click", (e) => {
    console.log("Stop button clicked");
    stopReading = true;
    loader?.classList.add("hide-loader");
    if(timerId) {
        clearTimeout(timerId);
    }
})

readFileBtn?.removeEventListener("click", (e) => {
    if(timerId) {
        clearTimeout(timerId);
    }
})