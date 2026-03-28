import { useState, useEffect } from "react"


const useFetch = <T>(fetchFunction: ()=> Promise<T>, autoFetch = true) =>{
    const [data, setData] = useState(<T | null>(null));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await fetchFunction();
            setData(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err : new Error('An error ocurred'));
        } finally {
            setLoading(false);
        }
    }

    const reset = ()=> {
        setData(null);
        setError(null);
        setLoading(false);
    }
    useEffect(()=>{
        if(autoFetch){
            fetchData();
        }
    },[])
    return {data, loading, error, fetchData, reset}
    
}
export default useFetch;