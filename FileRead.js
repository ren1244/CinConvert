var FileBuf,FileBuf_Len;
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
}


function init()
{
	var f1=document .getElementById("fileInput1");
	var f2=document .getElementById("fileInput2");
	f1 .setAttribute("onchange","onChangeFile(this,'display1')");
	f2 .setAttribute("onchange","onChangeFile(this,'display2')");
}
function run()
{
	var f1=document .getElementById("fileInput1").files;
	var reader;
	document .getElementById("download").innerHTML="";
	//讀取CNS-Unicode檔案
	ErrorLog="";
	FileBuf=[];
	FileBuf_Len=n=f1.length;
	for(i=0;i<n;++i)
	{
		reader=new FileReader();
		reader.onload=function(e)
		{
			FileBuf.push(e.target.result);
			if(FileBuf_Len==FileBuf.length)
				ReadCnsUnicode();
		}
		reader.readAsText(f1[i]);
	}
}
function ReadCnsUnicode()
{
	//document .getElementById("display3").innerHTML="讀取CnsUnicode表格...";
	document .getElementById("display3").innerHTML="";
	var i,j,n,txt,s,m,cns,uni,err_flag;
	err_flag=0;
	CnsUniTable=[];
	//建立CnsUniTable表格，若發現不符合格式，記錄在ErrorLog
	for(i=0;i<FileBuf_Len;++i)
	{
		txt=FileBuf[i].split("\n");
		n=txt.length;
		for(j=0;j<n;++j) //每行資料為txt[j];
		{
			s=txt[j].trim();
			if(s=="")
				continue;
			m=s.match(/[0-9A-F]{1,2}\t[0-9A-F]{4}\t[0-9A-F]{4,5}/);
			if(m===null || m[0].length!=s.length)
			{
				if(err_flag==0)
				{
					err_flag=1;
					ErrorLog+="【「CNS碼-Uincode」檔案未匯入資料(可能不符合格式)】\n";
				}
				ErrorLog+=s+"\n";
				continue;
			}
			cns=getHexFromString(s,0);
			m=cns>0xF?3:2;
			cns=cns<<16|getHexFromString(s,m);
			uni=getHexFromString(s,m+5);
			CnsUniTable.push({c:cns,u:uni});
		}
	}
	
	//讀取Cns-Phonetic檔案
	var f2=document .getElementById("fileInput2").files;
	var reader;
	FileBuf=[];
	FileBuf_Len=n=f2.length;
	
	for(i=0;i<n;++i)
	{
		reader=new FileReader();
		reader.onload=function(e)
		{
			FileBuf.push(e.target.result);
			if(FileBuf_Len==FileBuf.length)
				ReadCnsPhonetic();
		}
		reader.readAsText(f2[i]);
	}
}
function ReadCnsPhonetic()
{
	//document .getElementById("display3").innerHTML+="<br>讀取CnsPhonetic表格...";
	var i,j,k,f,n,txt,s,m,cns,phon,shift,uc,err_flag;
	err_flag=0;
	CnsPhonTable=[];
	for(i=0;i<FileBuf_Len;++i)
	{
		txt=FileBuf[i].split("\n");
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
				if(err_flag===0)
				{
					ErrorLog+="【「CNS碼-注音」檔案未匯入資料(可能不符合格式)】\n";
					err_flag=1;
				}
				ErrorLog+=s+"\n";
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
					if(err_flag===0)
					{
						ErrorLog+="【「CNS碼-注音」檔案未匯入資料(可能不符合格式)】\n";
						err_flag=1;
					}
					ErrorLog+=s+"\n";
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
	SortTables();
}//	ㄅㄙ:[3105,3119]	ㄚㄦ:[311A,3226]	ㄧㄩ:[3127,3129] ˇ:02C7	ˊ:02CA	ˋ:02CB	˙:02D9
function SortTables()
{
	var i,j,s,A,k,err_flag,err_flag2;
	err_flag2=err_flag=0;
	s=document .getElementById("display3");
	//排序讀取到的兩種表格
	//s.innerHTML+="<br>排序CNS-Unicode表格...";
	CnsUniTable.sort(cmp_CnsUni_CU);
	
	//建立[(index_of_phonTable,index_of_unicodeTable)]
	A=[];
	for(i=0;i<CnsPhonTable.length;++i)
		if((k=BinSearch(CnsPhonTable[i].c))>=0)
			A.push([i,k]);
		else
		{
			if(err_flag===0)
			{
				ErrorLog+="【CNS-注音表格中，以下CNS碼無法找到符合的Unicode】\n";
				err_flag=1;
			}
			ErrorLog+=toHex(CnsPhonTable[i].c,"-")+"\n";
		}
	
	//檢查是否有重複的「注音-UNICODE」
	A.sort(cmp_A_PU);//Phon-Unicode
	for(i=j=0;i<A.length;i+=k)
	{
		for(k=1;i+k<A.length && cmp_A_PU(A[i],A[i+k])==0;++k);
		if(k>1)
		{
			if(err_flag2===0)
			{
				ErrorLog+="【刪除重複的「注音-unicode」資料】\n";
				err_flag2=1;
			}
			ErrorLog+="刪除"+(k-1)+"個「"+toPhon(CnsPhonTable[A[i][0]].p)+"-"+toUTF16(CnsUniTable[A[i][1]].u)+"("+toHex(CnsUniTable[A[i][1]].u).toUpperCase()+")」\n";
		}
		A[j++]=A[i];
	}
	A.length=j;
	A.sort(cmp_A_PC);//Phon-Phonetic
	//輸出「注音-UNICODE」
	var out_str=getHeadStr().replace(/\n/g,"\r\n");
	for(i=0;i<A.length;++i)
		out_str+=toPhon(CnsPhonTable[A[i][0]].p)
			+"\t"+toUTF16(CnsUniTable[A[i][1]].u)+"\r\n";
	out_str+="%chardef end\n";
	var blob=new Blob([out_str],{type:"text/plain"});
	var blobUrl=URL.createObjectURL(blob);
	var link=document .getElementById("download");
	link .setAttribute("href",blobUrl);
	link .setAttribute("download","Phonetic.cin");
	link.innerHTML="Phonetic.cin";
	
	err_flag2=0;
	CnsUniTable.sort(cmp_CnsUni_UC);
	for(i=0;i<CnsUniTable.length;i+=k)
	{
		for(k=1;i+k<CnsUniTable.length && CnsUniTable[i].u==CnsUniTable[i+k].u;++k);
		if(k>1)
		{
			if(err_flag2===0)
			{
				ErrorLog+="【相同的Unicode有不同的CNS】\n";
				err_flag2=1;
			}
			for(j=0;j<k;++j)
				ErrorLog+=""+toHex(CnsUniTable[i+j].c,"\t").toUpperCase()
					+"\t"+toHex(CnsUniTable[i+j].u).toUpperCase()
					+"\t"+toUTF16(CnsUniTable[i+j].u)+"\n";
		}
	}
	s.innerHTML+=""+ErrorLog.substr(0,2048).replace(/\n/g,"<br>");
	if(ErrorLog.length>2048)
		s.innerHTML+="(資料過長...)";
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
	var p1,p2,u1,u2;
	p1=CnsPhonTable[a[0]].p;
	p2=CnsPhonTable[b[0]].p;
	u1=CnsUniTable[a[1]].u;
	u2=CnsUniTable[b[1]].u;
	return p1==p2?u1-u2:p1-p2;
}
function cmp_A_PC(a,b)
{
	var p1,p2,c1,c2;
	p1=CnsPhonTable[a[0]].p;
	p2=CnsPhonTable[b[0]].p;
	c1=CnsUniTable[a[1]].c;
	c2=CnsUniTable[b[1]].c;
	return p1==p2?c1-c2:p1-p2;
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
	var str;
	str="\
%gen_inp\n\
%ename "+document .getElementById("ename").value+"\n\
%cname "+document .getElementById("cname").value+"\n\
%selkey 0123456789\n\
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
