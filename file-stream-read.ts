// import fs from "promise-fs";

const fileInput: any = document.getElementById('file-input');
const readFileBtn = document.getElementById('read-file');
const stopReadFileBtn = document.getElementById('stop-file-read');
const loader = document.getElementById('loader');
const readFileContent = document.getElementById('file-content');

let streamReader: ReadableStream | null = null, receivedLength = 0, 
    reader: any | null = null;
readFileBtn?.addEventListener("click", (e) => {
    if(!readFileContent || !loader) {
        throw new Error("No place to write file content!");   
    }
    readFileContent.innerText = "";
    loader.classList.remove("hide-loader");
    receivedLength  = 0;

    try {
        // const file = fileInput?.files?.[0];
        // if (!file) {
        //     console.log("Please select a file first");
        //     return;
        // }
        fetch("./big.txt").then(res => {
            reader = res?.body?.getReader() ?? null;

            streamReader = new ReadableStream({
                start: function push(controller) {
                    reader?.read().then((result: any) => {
                        console.log("Reading in stream...");
                        if(result.done) {
                            console.log("File reading complete");
                            controller.close();
                            return;
                        }
        
                        receivedLength += result.value.byteLength;
                        const text = new TextDecoder().decode(result.value);
                        // controller.enqueue(text);
                        readFileContent.append(text);
                        loader.innerText = `Received ${receivedLength} bytes...`;
                        // loader.classList.add("hide-loader");

                        setTimeout(() => {
                            push(controller);
                        }, 1000);
                    })
                },
            })
            // return streamReader;
       })
    } catch(error) {
        console.log(error);
    } finally {
        loader?.classList.remove("hide-loader");
    }

    // if(!fileHandle) {
    //     loader?.classList.add("hide-loader");
    //     fs.open("./big.txt", "r").then((fh) => {
    //         console.log("Opened file handle in read mode");
    //         fileHandle = fh;
            
    //         fileHandle.readFile().then((res: any) => {
    //             console.log("No of bytes: ", res.byteLength);
    //             readFileContent?.append(res.toString());
    //         }).catch(console.log)
    //         .finally(() => {
    //             loader?.classList.remove("hide-loader");
    //         });
    //     });
    // } else {
    //     console.log("Reading file...");
    // }
})

stopReadFileBtn?.addEventListener("click", () => {
    if(reader) {
        reader.cancel("Stopped").then(() => {
            console.log("File reading stopped!");
        })
    }
    if(loader) {
        loader.innerText = `Received ${receivedLength} bytes...`;
    }
})