"use client";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2Icon, RotateCw, ZoomInIcon, ZoomOutIcon } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc= `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PDFViewer({url}:{
    url:string
}) {
    const [numPages, setNumPages]= useState<number>();
    const [pageNumber, setPageNumber]= useState<number>(1);
    const [file, setFile]=useState<Blob | null>(null);
    const [rotation, setRotation]=useState<number>(0);
    const [scale, setScale]=useState<number>(1);

    useEffect(()=>{
        const fetchFile=async()=>{
            const response=await fetch(url);
            // console.log(response);
            const fileData=await response.blob();
            // console.log(fileData);

            setFile(fileData);
        };

        fetchFile();
    },[url]);

    const onDocumentLoadSuccess= ({numPages}:{numPages:number}):void=>{
        setNumPages(numPages);
    };

  return (
    <div className="flex flex-col justify-center items-center">
        <div className="sticky top-0 z-50 bg-gray-100 p-2 rounded-b-lg">
            <div className="max-w-6xl px-2 grid grid-cols-6 gap-2">
                <Button
                variant="outline"
                disabled={pageNumber===1}
                onClick={()=>{
                    if(pageNumber>1){
                        setPageNumber(pageNumber-1);
                    }
                }}
                >
                    Previous
                </Button>

                <p className="flex items-center justify-center">
                    {pageNumber} of {numPages}
                </p>

                <Button
                variant="outline"
                disabled={pageNumber===numPages}
                onClick={()=>{
                    if(numPages){
                        if(pageNumber<numPages){
                            setPageNumber(pageNumber+1);
                        }
                    }
                }}
                >
                    Next
                </Button>

                <Button
                variant="outline"
                onClick={()=>{
                    setRotation((rotation+90)%360);
                }}
                >
                    <RotateCw/>
                </Button>

                <Button
                variant="outline"
                disabled={scale>=1.5}
                onClick={()=>{
                    setScale(scale*1.2);
                }}
                >
                    <ZoomInIcon/>
                </Button>

                <Button
                variant="outline"
                disabled={scale<=0.75}
                onClick={()=>{
                    setScale(scale/1.2);
                }}
                >
                    <ZoomOutIcon/>
                </Button>
            </div>

        </div>

        {!file?(
            <Loader2Icon className="h-20 w-20 text-indigo-600 mt-20 animate-spin"/>
        ):(<Document
        loading={null}
        file={file}
        rotate={rotation}
        onLoadSuccess={onDocumentLoadSuccess}
        className="m-4 overflow-scroll"
        >
            <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg overflow-hidden"
            />
        </Document>)}
    </div>
  );
}

export default PDFViewer;