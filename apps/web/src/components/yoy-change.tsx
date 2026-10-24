export function YoyChange({value}:{value:number|null}) {
 const direction=value===null||value===0?'neutral':value>0?'up':'down';
 const formatted=value===null?'—':`${value>0?'+':''}${value.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`;
 const description=value===null?'Chưa đủ dữ liệu so sánh':value===0?'Không đổi':`${value>0?'Tăng':'Giảm'} ${Math.abs(value).toLocaleString('vi-VN',{maximumFractionDigits:2})}%`;
 return <span className={`yoy-change yoy-${direction}`} aria-label={description}>{value!==null&&value!==0&&<span aria-hidden="true">{value>0?'▲':'▼'} </span>}{formatted}</span>;
}
