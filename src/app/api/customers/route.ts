export default function GET (request:Request) {
    const { data, error } = await supabase
    .from('characters')
    .select()
}