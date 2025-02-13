export default async function checkStatus (url: string, debug: boolean): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'GET' });
        if (debug) {
            console.log(response);
        }
        return true;
    } catch (error) {
        return false
    }
}