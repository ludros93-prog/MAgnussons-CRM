// An inventory row can disappear after a reviewed transfer. Return keyboard
// focus to the surviving row, or to the current inventory heading.
export function restoreHandoverFocus(event:Event,opener:HTMLElement|null,fallback:()=>HTMLElement|null){
 event.preventDefault();
 const usable=(element:HTMLElement|null):element is HTMLElement=>!!element?.isConnected&&!element.matches(':disabled,[aria-disabled=true]')&&!element.closest('[hidden],[inert],[aria-hidden=true]')&&!!element.getClientRects().length&&getComputedStyle(element).visibility==='visible';
 const heading=fallback();if(!usable(heading))return;
 const target=usable(opener)?opener:heading;target.focus({preventScroll:true});
 if(document.activeElement!==target){heading.focus();return;}
 const bounds=target.getBoundingClientRect();
 if(bounds.top<8||bounds.bottom>window.innerHeight-8||bounds.left<8||bounds.right>window.innerWidth-8)target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
}
