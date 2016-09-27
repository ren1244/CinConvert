/*
【全域變數】
CnsUniTable
	[{c:整數，CNS碼數值,u:整數，Unicode數值},...]
var CnsPhonTable;
	[{c:整數，CNS碼數值,p:整數，注音代碼},...]
	※注音代碼每6 bit為ㄧ個數值，由高位向低位放置，第一個注音放在 bit 29~24，第二個放在 bit 23~18，比較時相當於模擬注音字串的順序。
var ErrorLog;
	儲存所有錯誤訊息。

【html控制】
function onChangeFile(f,dname)
	更新選取的檔名
function init()
	起始化

【處理程序】點「轉換」按鈕後，會執行
	run->((FilesReader->CreateCnsUnicode)|(FilesReader->CreateCnsPhonetic))->runProc
	中間是異步處理
function run() 
	讀取CNS-Unicode檔案，將檔案內容儲存至FileBuf[]中。
function CreateCnsUnicode(strarr)
	以strarr資料建立CNS-Unicode映射表，儲存於CnsUniTable。
function CreateCnsPhonetic(strarr)
 	以strarr資料建立CNS-Phonetic映射表，儲存於CnsPhonTable。
function runProc()
	處理CnsUniTable及CnsPhonTable，輸出結果。

【搜尋】
function BinSearch(key)
	二元搜尋法，針對排序好的CnsUniTable(小到大)。
	key為CNS碼。
	回傳index。若找不到回傳-1。

【比較函數】
function cmp_CnsUni_CU(a,b)
	比較函數：針對CnsUniTable，先比CNS再比Unicode
function cmp_CnsUni_UC(a,b)
	比較函數：針對CnsUniTable，先比Unicode再比CNS
function cmp_CnsPhon_PC(a,b)
	比較函數：針對CnsPhonTable，先比Phonetic再比CNS
function cmp_A_PU(a,b)
	比較函數：針對A，先比Phonetic再比Unicode
function cmp_A_PC(a,b)
	比較函數：針對A，先比Phonetic再比CNS

【轉換】
function toUTF16(uc)
	將整數uc轉換為文字，uc代表此文字的unicode碼。
function getHexFromString(str,pos)
	從pos位置開始讀取字串str，回傳此16進位字串代表的整數。
	str是16進位字串，例如"A8FF"。
function toHex(v,sep)
	將數值v轉換為16進位字串。
	sep為每4位數就插入的分隔字元。
function toPhon(phon)
	將phon數值轉換為鍵盤符號字串。
function getHeadStr()
	回傳Cin檔案前面的檔頭。
*/

var CnsUniTable;
var CnsPhonTable;
var ErrorLog;

function onChangeFile(f,dname)
{
	var d=document .getElementById(dname);
	var i,n;
	n=f.files.length;
	d.innerHTML="";
	for(i=0;i<n;++i)
		d.innerHTML+=f.files[i].name+"<br>";
	if(n==0)
		d.innerHTML="<span style='color:gray;'>未選擇檔案</span>"
}
function init()
{
	var f1=document .getElementById("fileInput1");
	var f2=document .getElementById("fileInput2");
	f1 .setAttribute("onchange","onChangeFile(this,'display1')");
	f2 .setAttribute("onchange","onChangeFile(this,'display2')");
	onChangeFile(f1,'display1');
	onChangeFile(f2,'display2');
}
function FilesReader(files,callback,callback2)
{
	var count=0;
	var strarr=[];
	var i,n;
	var reader;
	function f()
	{
		if(++count>=n)
		{
			callback(strarr);
			callback2();
		}
	}
	n=files.length;
	for(i=0;i<n;++i)
	{
		reader=new FileReader();
		reader.onload=function(e)
		{
			strarr.push(e.target.result);
			f();
		};
		reader.readAsText(files[i]);
	}
}
function run()
{
	document .getElementById("display3").innerHTML="";
	document .getElementById("download").innerHTML="";
	var flag=0;
	var f1=document .getElementById("fileInput1").files;
	ErrorLog=[];
	function f()
	{
		if(++flag>=2)
			runProc();
	}
	FilesReader(document .getElementById("fileInput1").files,CreateCnsUnicode,f);
	FilesReader(document .getElementById("fileInput2").files,CreateCnsPhonetic,f);
}
function CreateCnsUnicode(strarr)
{
	var i,j,n,txt,s,m,cns,uni,err;
	CnsUniTable=[];
	err="";
	//建立CnsUniTable表格，若發現不符合格式，記錄在ErrorLog
	for(i=0;i<strarr.length;++i)
	{
		txt=strarr[i].split("\n");
		n=txt.length;
		for(j=0;j<n;++j) //每行資料為txt[j];
		{
			s=txt[j].trim();
			if(s=="")
				continue;
			m=s.match(/[0-9A-F]{1,2}\t[0-9A-F]{4}\t[0-9A-F]{4,5}/);
			if(m===null || m[0].length!=s.length)
			{
				err+=s+"\n";
				continue;
			}
			cns=getHexFromString(s,0);
			m=cns>0xF?3:2;
			cns=cns<<16|getHexFromString(s,m);
			uni=getHexFromString(s,m+5);
			CnsUniTable.push({c:cns,u:uni});
		}
	}
	if(err.length)
		ErrorLog.push({h:"Cns-Unicode格式錯誤",txt:err});
}
function CreateCnsPhonetic(strarr)
{
	var i,j,k,f,n,txt,s,m,cns,phon,shift,uc,err;
	err="";
	CnsPhonTable=[];
	for(i=0;i<strarr.length;++i)
	{
		txt=strarr[i].split("\n");
		n=txt.length;
		for(j=0;j<n;++j) //每行資料為txt[j];
		{
			s=txt[j].trim();
			if(s=="")
				continue;
			if(s.search(/[0-9A-F]{1}\t[0-9A-F]{4}\t/)==0)
				m=7;
			else if(s.search(/[0-9A-F]{2}\t[0-9A-F]{4}\t/)==0)
				m=8;
			else
			{
				err+=s+"\n";
				continue;
			}
			cns=getHexFromString(s,0)<<16|getHexFromString(s,m-5);
			k=f=0;
			phon=0;
			shift=24;
			for(uc=s.charCodeAt(m);m<s.length;uc=s.charCodeAt(++m))
			{
				if(uc==0x02d9 && k==0) //輕聲
				{
					k=1;
					f=1;
				}
				else if(0x3105<=uc && uc<=0x3119 && k<2) //ㄅ到ㄙ
				{
					k=2;
					phon|=(uc-0x3105+5)<<(shift-=6);
				}
				else if(0x3127<=uc && uc<=0x3129 && k<3) //ㄧ到ㄩ
				{
					k=3;
					phon|=(uc-0x3127+39)<<(shift-=6);
				}
				else if(0x311A<=uc && uc<=0x3126 && k<4) //ㄚ到ㄦ
				{
					k=4;
					phon|=(uc-0x311A+26)<<(shift-=6);
				}
				else if((uc==0x02d9 || uc==0x02ca || uc==0x02c7 || uc==0x02cb) && k<5 && f==0) //二到四聲
				{
					k=5;
					phon|=(uc==0x02ca?3:uc==0x02c7?2:uc==0x02d9?1:4)<<(shift-=6);
				}
				else
				{
					err+=s+"\n";
					k=-1;
					break;
				}
			}
			if(k>0)
			{
				if(f==1)
					phon|=1<<(shift-=6);
				CnsPhonTable.push({c:cns,p:phon});
			}
		}
	}
	if(err.length)
		ErrorLog.push({h:"Cns-Phonetic格式錯誤",txt:err});
}//	ㄅㄙ:[3105,3119]	ㄚㄦ:[311A,3226]	ㄧㄩ:[3127,3129] ˇ:02C7	ˊ:02CA	ˋ:02CB	˙:02D9
function runProc()
{
	var i,j,s,A,k,err;
	
	s=document .getElementById("display3");
	//排序讀取到的兩種表格
	CnsUniTable.sort(cmp_CnsUni_CU);
	
	//建立[(index_of_phonTable,index_of_unicodeTable)]
	A=[];
	err="";
	for(i=0;i<CnsPhonTable.length;++i)
		if((k=BinSearch(CnsPhonTable[i].c))>=0)
			A.push({p:CnsPhonTable[i],u:CnsUniTable[k]});
		else
			err+=toHex(CnsPhonTable[i].c,"\t")+"\n";
	if(err.length)
		ErrorLog.push({h:"Cns-Phonetic無對應Unicode",txt:err});
	
	//檢查是否有重複的「注音-UNICODE」
	A.sort(cmp_A_PU);//Phon-Unicode
	err="";
	for(i=j=0;i<A.length;i+=k)
	{
		for(k=1;i+k<A.length && cmp_A_PU(A[i],A[i+k])==0;++k);
		if(k>1)
			err+="刪除"+(k-1)+"個「"+toPhon(A[i].p.p)+"-"+toUTF16(A[i].u.u)+"("+toHex(A[i].u.u).toUpperCase()+")」\n";
		A[j++]=A[i];
	}
	if(err.length)
		ErrorLog.push({h:"刪除重複資料",txt:err});
	A.length=j;
	A.sort(cmp_A_PC);//Phon-Phonetic
	//輸出「注音-UNICODE」
	var out_str=getHeadStr().replace(/\n/g,"\r\n");
	for(i=0;i<A.length;++i)
		out_str+=toPhon(A[i].p.p)
			+"\t"+toUTF16(A[i].u.u)+"\r\n";
	out_str+="%chardef end\n";
	var out_filename=document .getElementById("suit").selectedIndex==0?"Phonetic_gcin.cin":"Phonetic_OpenVanilla.cin";
	refreshDownloadUrl(document .getElementById("download"),out_str,out_filename,out_filename);
	
	CnsUniTable.sort(cmp_CnsUni_UC);
	err="";
	for(i=0;i<CnsUniTable.length;i+=k)
	{
		for(k=1;i+k<CnsUniTable.length && CnsUniTable[i].u==CnsUniTable[i+k].u;++k);
		if(k>1)
		{
			for(j=0;j<k;++j)
				err+=""+toHex(CnsUniTable[i+j].c,"\t").toUpperCase()
					+"\t"+toHex(CnsUniTable[i+j].u).toUpperCase()
					+"\t"+toUTF16(CnsUniTable[i+j].u)+"\n";
		}
	}
	if(err.length)
		ErrorLog.push({h:"相異Cns對應相同Unicode",txt:err});
	for(i=0;i<ErrorLog.length;++i)
		createErrorMsg(s,ErrorLog[i].h,ErrorLog[i].txt);
}
function refreshDownloadUrl(aTag_ref,out_str,LinkName,FileName)
{
	var blob=new Blob([out_str],{type:"text/plain"});
	var blobUrl=URL.createObjectURL(blob);
	aTag_ref .setAttribute("href",blobUrl);
	aTag_ref .setAttribute("download",FileName);
	if(typeof LinkName == "string")
		aTag_ref.innerHTML=LinkName;
	else
		aTag_ref .appendChild(LinkName);
}
function createErrorMsg(p,header,msg)
{
	svgDownload_icon="<svg width='16px' height=16px>\
<path d='M5,0 L11,0 11,6 16,6 8,15 0,6 5,6 z' style='fill:blue;'/>\
<path d='M0,15 L16,15' style='stroke:blue;stroke-width:2px;'/>\
</svg>";
	var t,h;
	var d=document .createElement("div");
	d .setAttribute("style","display:inline-block;vertical-align:top;margin:0.25em;padding:0.5em;border:1px solid;border-radius:5px;");
	
	d .appendChild(h=document .createElement("h4"));
		h .appendChild(document.createTextNode(header+" "));
		h .appendChild(t=document .createElement("a"));
		refreshDownloadUrl(t,msg,svgDownload_icon,header+".txt");
	
	d .appendChild(t=document .createElement("pre"));
	t .appendChild(document.createTextNode(msg));
	
	p .appendChild(d);
}
function toUTF16(uc)
{
	if(uc>0xFFFF)
	{
		uc-=0x10000;
		return String.fromCharCode(0xD800+(uc>>>10),(uc&0x3FF)+0xDC00);
	}
	else
		return String.fromCharCode(uc);
}
function BinSearch(key)
{
	var l,u,h,v,key;
	l=0;
	u=CnsUniTable.length-1;
	if(key<CnsUniTable[l].c || key>CnsUniTable[u].c)
		return -1;
	while(l<u)
	{
		h=(l+u)>>>1;
		v=CnsUniTable[h].c;
		if(key<v)
			u=h;
		else if(key>v)
			l=h+1;
		else if(key==v)
			return h;
	}
	return CnsUniTable[u].c==key?l:-1;
}
function cmp_CnsUni_CU(a,b)
{
	return a.c==b.c?a.u-b.u:a.c-b.c; 
}
function cmp_CnsUni_UC(a,b)
{
	return a.u==b.u?a.c-b.c:a.u-b.u; 
}
function cmp_CnsPhon_PC(a,b)
{
	return a.p==b.p?a.c-b.c:a.p-b.p; 
}
function cmp_A_PU(a,b)
{
	return a.p.p==b.p.p?a.u.u-b.u.u:a.p.p-b.p.p;
}
function cmp_A_PC(a,b)
{
	return a.p.p==b.p.p?a.u.c-b.u.c:a.p.p-b.p.p;
}
function getHexFromString(str,pos)
{
	var i,n,r,ch;
	n=str.length;
	r=0;
	for(i=pos;i<n;++i)
	{
		ch=str.charCodeAt(i);
		ch=(0x30<=ch && ch<=0x39?ch-0x30:(0x41<=ch && ch<=0x46?ch-0x41+10:0xFF));
		if(ch==0xFF)
			break;
		r=r<<4|ch;
	}
	return r;
}
function toHex(v,sep)
{
	var i;
	var s="";
	var c="0123456789ABCDEF";
	if(sep===null || sep===undefined)
		s+=v.toString(16);
	else
		s+=(v>>16).toString(16)+sep+("0000"+(v&0xFFFF).toString(16)).substr(-4);
	return s;
}
function toPhon(phon)
{
	var P,str,n,shift;
	P="73641qaz2wsxedcrfv5tgbyhn8ik,9ol.0p;/-ujm";
	//P="˙ˇˊˋㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ";
	str="";
	n=0;
	shift=18;
	for(;shift>=0 && (phon>>>shift&0x3F);shift-=6)
		str+=P[(phon>>>shift&0x3F)-1];
	return str;
}
function getHeadStr()
{
	var t=document .getElementById("suit").selectedIndex;
	var str;
	str="\
%gen_inp\n\
%ename "+document .getElementById("ename").value+"\n\
%cname "+document .getElementById("cname").value+"\n"
+(t==0?"":"%encoding UTF-8\n")
+"%selkey 123456789\n"
+(t==0?"%dupsel 9\n":"")
+"%endkey 3467\n\
%keyname begin\n\
, ㄝ\n\
- ㄦ\n\
. ㄡ\n\
/ ㄥ\n\
0 ㄢ\n\
1 ㄅ\n\
2 ㄉ\n\
3 ˇ\n\
4 ˋ\n\
5 ㄓ\n\
6 ˊ\n\
7 ˙\n\
8 ㄚ\n\
9 ㄞ\n\
; ㄤ\n\
a ㄇ\n\
b ㄖ\n\
c ㄏ\n\
d ㄎ\n\
e ㄍ\n\
f ㄑ\n\
g ㄕ\n\
h ㄘ\n\
i ㄛ\n\
j ㄨ\n\
k ㄜ\n\
l ㄠ\n\
m ㄩ\n\
n ㄙ\n\
o ㄟ\n\
p ㄣ\n\
q ㄆ\n\
r ㄐ\n\
s ㄋ\n\
t ㄔ\n\
u ㄧ\n\
v ㄒ\n\
w ㄊ\n\
x ㄌ\n\
y ㄗ\n\
z ㄈ\n\
%keyname end\n\
%endkey 3467\n\
%chardef begin\n\
";
	return str;
}
